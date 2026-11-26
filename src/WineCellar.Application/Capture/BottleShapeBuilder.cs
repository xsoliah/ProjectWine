using System.Text.Json;
using WineCellar.Domain;

namespace WineCellar.Application.Capture;

/// <summary>
/// Derives the bottle profile and the label placement from the bottle outline and the label corners on a photo.
/// Pure geometry: everything is measured in units of the photo height (x is scaled by the photo's aspect ratio), so
/// the proportions of a non-square photo stay correct.
/// </summary>
public static class BottleShapeBuilder
{
    /// <summary>Number of rows measured from base to mouth.</summary>
    public const int Rows = 24;

    /// <summary>The bottle must cover at least this share of the photo height.</summary>
    public const double MinHeightShare = 0.3;

    /// <summary>Allowed body radius relative to the bottle height (real bottles: 0.06 to 0.16).</summary>
    public const double MinBodyRadius = 0.05;
    public const double MaxBodyRadius = 0.25;

    /// <summary>Mean sideways drift of the centre line relative to the body radius; more means tilted or lying.</summary>
    public const double MaxAsymmetry = 0.5;

    /// <summary>The neck must be clearly narrower than the body.</summary>
    public const double MaxNeckToBody = 0.7;

    /// <param name="aspect">Photo width divided by photo height.</param>
    /// <param name="label">Label corners on the same photo; null estimates the label (and asks for a review).</param>
    /// <returns>Null when the outline is not a plausible upright bottle.</returns>
    public static BottleShape? FromOutline(IReadOnlyList<LabelPoint> outline, double aspect, LabelCorners? label)
    {
        if (Measure(outline, aspect) is not { } m) return null;
        if (label is null) return new BottleShape(m.Profile, BottleShape.StandardLabel, Round(outline), NeedsReview: true).Rounded();
        var placement = PlaceLabel(m, label, aspect) ?? BottleShape.StandardLabel;
        return new BottleShape(m.Profile, placement, Round(outline), NeedsReview: placement == BottleShape.StandardLabel).Rounded();
    }

    /// <summary>Profile of a user-edited outline; null when the outline is implausible.</summary>
    public static IReadOnlyList<BottleProfilePoint>? ProfileFromOutline(IReadOnlyList<LabelPoint> outline, double aspect) =>
        Measure(outline, aspect)?.Profile;

    /// <summary>Position, size and turn of the label relative to the bottle; null when the label does not lie on it.</summary>
    public static BottleLabelPlacement? PlaceLabel(IReadOnlyList<LabelPoint> outline, double aspect, LabelCorners label) =>
        Measure(outline, aspect) is { } m ? PlaceLabel(m, label, aspect) : null;

    private static List<LabelPoint> Round(IReadOnlyList<LabelPoint> outline) => outline.ToList();

    private sealed record Measurement(
        IReadOnlyList<BottleProfilePoint> Profile, IReadOnlyList<LabelPoint> Outline, double MinY, double MaxY);

    private static Measurement? Measure(IReadOnlyList<LabelPoint> outline, double aspect)
    {
        if (!BottleShape.OutlineIsPlausible(outline) || !double.IsFinite(aspect) || aspect <= 0) return null;
        var minY = outline.Min(p => p.Y);
        var maxY = outline.Max(p => p.Y);
        var height = maxY - minY;
        if (height < MinHeightShare) return null;

        // Half width and centre of every row (photo-height units), measured slightly inside the extremes
        // where a rounded base or mouth would have no width.
        var radii = new double[Rows];
        var centres = new double[Rows];
        for (var i = 0; i < Rows; i++)
        {
            var t = Math.Clamp((double)i / (Rows - 1), 0.01, 0.99);
            if (RowAt(outline, maxY - t * height) is not var (left, right)) return null;
            radii[i] = (right - left) / 2 * aspect / height;
            centres[i] = (left + right) / 2 * aspect;
        }

        var maxRadius = radii.Max();
        if (maxRadius is < MinBodyRadius or > MaxBodyRadius) return null;

        // Upright and symmetrical: the centre line stays put.
        var axis = centres.OrderBy(c => c).ElementAt(Rows / 2);
        var asymmetry = centres.Average(c => Math.Abs(c - axis)) / (maxRadius * height);
        if (asymmetry > MaxAsymmetry) return null;

        var neck = radii.Skip((int)(Rows * 0.8)).Average();
        if (neck > MaxNeckToBody * maxRadius) return null;

        var smooth = Smooth(radii);
        var profile = new List<BottleProfilePoint>(Rows);
        for (var i = 0; i < Rows; i++)
            profile.Add(new BottleProfilePoint(Math.Round((double)i / (Rows - 1), 4), Math.Round(Math.Clamp(smooth[i], 0.02, 0.35), 4)));
        return new Measurement(profile, outline, minY, maxY);
    }

    /// <summary>One pass of a 3-point moving average; the ends keep their values.</summary>
    public static double[] Smooth(IReadOnlyList<double> values)
    {
        var result = values.ToArray();
        for (var i = 1; i < values.Count - 1; i++) result[i] = (values[i - 1] + 2 * values[i] + values[i + 1]) / 4;
        return result;
    }

    private static BottleLabelPlacement? PlaceLabel(Measurement m, LabelCorners label, double aspect)
    {
        var height = m.MaxY - m.MinY;
        double Share(double y) => (m.MaxY - y) / height;
        var top = Share((label.TopLeft.Y + label.TopRight.Y) / 2);
        var bottom = Share((label.BottomLeft.Y + label.BottomRight.Y) / 2);
        if (top < bottom) (top, bottom) = (bottom, top);
        top = Math.Min(1, top);
        bottom = Math.Max(0, bottom);
        if (top - bottom < BottleShape.MinLabelHeight) return null;

        double Metric(LabelPoint a, LabelPoint b) => Math.Sqrt(Math.Pow((a.X - b.X) * aspect, 2) + Math.Pow(a.Y - b.Y, 2));
        var labelWidth = (Metric(label.TopLeft, label.TopRight) + Metric(label.BottomLeft, label.BottomRight)) / 2;

        var midY = m.MaxY - (top + bottom) / 2 * height;
        if (RowAt(m.Outline, midY) is not var (left, right)) return null;
        var body = (right - left) * aspect; // visible diameter at the label's height
        if (body <= 0) return null;

        var centreX = label.Points.Average(p => p.X);
        var offset = (centreX - (left + right) / 2) * aspect / (body / 2);
        var width = Math.Clamp(labelWidth / body, BottleShape.MinLabelWidth, BottleShape.MaxLabelWidth);
        return new BottleLabelPlacement(top, bottom, width, Math.Asin(Math.Clamp(offset, -1, 1)));
    }

    /// <summary>Leftmost and rightmost x of the polygon on the horizontal line y; null when the line misses it.</summary>
    public static (double Left, double Right)? RowAt(IReadOnlyList<LabelPoint> polygon, double y)
    {
        double? left = null, right = null;
        for (var i = 0; i < polygon.Count; i++)
        {
            var a = polygon[i];
            var b = polygon[(i + 1) % polygon.Count];
            if (a.Y == b.Y || y < Math.Min(a.Y, b.Y) || y > Math.Max(a.Y, b.Y)) continue;
            var x = a.X + (b.X - a.X) * (y - a.Y) / (b.Y - a.Y);
            left = left is null ? x : Math.Min(left.Value, x);
            right = right is null ? x : Math.Max(right.Value, x);
        }
        return left is { } l && right is { } r && r > l ? (l, r) : null;
    }
}

/// <summary>Conversions between stored JSON and <see cref="BottleShape"/>.</summary>
public static class BottleShapeJson
{
    public static string Serialize(BottleShape shape) => JsonSerializer.Serialize(shape.Rounded(), LabelCornersJson.Options);

    /// <summary>The stored shape, or null when there is none or it is unusable (then the standard bottle is shown).</summary>
    public static BottleShape? Deserialize(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            var shape = JsonSerializer.Deserialize<BottleShape>(json, LabelCornersJson.Options);
            return shape is not null && shape.IsPlausible() ? shape : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
