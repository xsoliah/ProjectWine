namespace WineCellar.Domain;

/// <summary>
/// One point of the bottle's outer wall. <c>Height</c> runs from 0 (base) to 1 (mouth) and <c>Radius</c> is
/// relative to the whole bottle height (a 750 ml Bordeaux bottle has about 0.12 at the body).
/// </summary>
public sealed record BottleProfilePoint(double Height, double Radius);

/// <summary>
/// Where the label sits on the bottle. <c>Top</c> and <c>Bottom</c> are heights (0 = base, 1 = mouth) of the label's
/// upper and lower edge, <c>WidthFraction</c> is the label width as a share of the body diameter at that height
/// (the photo is flat, so the curve is not unrolled; 1 = as wide as the bottle looks) and <c>CenterAngle</c> turns the
/// label's centre around the bottle in radians (0 = facing the viewer, positive = to the right).
/// </summary>
public sealed record BottleLabelPlacement(double Top, double Bottom, double WidthFraction, double CenterAngle);

/// <summary>
/// Measurements of a bottle ("Flaschenmaß"): the profile for the 3D view, the label placement and - when it was
/// detected on a photo - the outline on that photo (normalized 0..1, same coordinates as the label corners).
/// </summary>
/// <param name="Outline">Polygon of the bottle on the original photo; null for a standard bottle.</param>
/// <param name="NeedsReview">The bottle could not be detected reliably; the user should check it ("Flasche prüfen").</param>
public sealed record BottleShape(
    IReadOnlyList<BottleProfilePoint> Profile,
    BottleLabelPlacement Label,
    IReadOnlyList<LabelPoint>? Outline = null,
    bool NeedsReview = false)
{
    public const int MinProfilePoints = 8;
    public const int MaxProfilePoints = 64;
    public const int MinOutlinePoints = 6;
    public const int MaxOutlinePoints = 100;
    public const double MinLabelHeight = 0.04;
    public const double MinLabelWidth = 0.05;

    /// <summary>A label cannot be wider than the whole circumference (2 pi radians = 2 pi / 2 body diameters).</summary>
    public const double MaxLabelWidth = Math.PI;

    /// <summary>Wall profile of a Bordeaux bottle as measured in the rack view (length 2.9, radius 0.36).</summary>
    private static readonly (double R, double Y)[] StandardWall =
    [
        (0.33, 0), (0.36, 0.03), (0.36, 1.85), (0.345, 1.98), (0.29, 2.1), (0.2, 2.19), (0.14, 2.26),
        (0.12, 2.36), (0.12, 2.78), (0.135, 2.8), (0.135, 2.88), (0.1, 2.9),
    ];

    /// <summary>The label of a standard bottle sits in the lower third, centred.</summary>
    public static BottleLabelPlacement StandardLabel { get; } = new(0.5, 0.155, 0.96, 0);

    /// <summary>
    /// Standard bottle for a wine type: Bordeaux shape, sparkling wine a little stockier. The size in ml only scales the
    /// absolute height in the 3D view, not these relative measures.
    /// </summary>
    public static BottleShape Standard(WineType type = WineType.Red)
    {
        var scale = type == WineType.Sparkling ? 1.12 : 1.0;
        var profile = StandardWall
            .Select(p => new BottleProfilePoint(Math.Round(p.Y / 2.9, 4), Math.Round(p.R / 2.9 * scale, 4)))
            .ToList();
        return new BottleShape(profile, StandardLabel);
    }

    /// <summary>Radius of the wall at a height, linearly interpolated.</summary>
    public double RadiusAt(double height)
    {
        var p = Profile;
        if (height <= p[0].Height) return p[0].Radius;
        for (var i = 1; i < p.Count; i++)
        {
            if (height > p[i].Height) continue;
            var span = p[i].Height - p[i - 1].Height;
            var t = span <= 0 ? 0 : (height - p[i - 1].Height) / span;
            return p[i - 1].Radius + (p[i].Radius - p[i - 1].Radius) * t;
        }
        return p[^1].Radius;
    }

    /// <summary>Coordinates rounded to 4 decimals; keeps the stored JSON short.</summary>
    public BottleShape Rounded()
    {
        static LabelPoint R(LabelPoint p) => new(Math.Round(p.X, 4), Math.Round(p.Y, 4));
        return this with
        {
            Profile = Profile.Select(p => new BottleProfilePoint(Math.Round(p.Height, 4), Math.Round(p.Radius, 4))).ToList(),
            Label = new BottleLabelPlacement(
                Math.Round(Label.Top, 4), Math.Round(Label.Bottom, 4), Math.Round(Label.WidthFraction, 4), Math.Round(Label.CenterAngle, 4)),
            Outline = Outline?.Select(R).ToList(),
        };
    }

    /// <summary>Why the shape is unusable, or null when it is plausible.</summary>
    public string? Problem()
    {
        if (Profile is null || Label is null) return "Das Flaschenmaß ist unvollständig.";
        if (Profile.Count is < MinProfilePoints or > MaxProfilePoints)
            return $"Das Flaschenprofil braucht {MinProfilePoints} bis {MaxProfilePoints} Punkte.";
        for (var i = 0; i < Profile.Count; i++)
        {
            var p = Profile[i];
            if (!double.IsFinite(p.Height) || !double.IsFinite(p.Radius) || p.Radius is < 0.02 or > 0.35)
                return "Der Flaschenradius ist ungültig.";
            if (i > 0 && p.Height <= Profile[i - 1].Height) return "Die Höhen des Flaschenprofils müssen aufsteigen.";
        }
        if (Profile[0].Height > 0.02 || Profile[^1].Height < 0.98) return "Das Flaschenprofil muss vom Boden bis zur Mündung reichen.";

        var l = Label;
        if (!double.IsFinite(l.Top) || !double.IsFinite(l.Bottom) || !double.IsFinite(l.WidthFraction) || !double.IsFinite(l.CenterAngle))
            return "Die Etikettenlage ist ungültig.";
        if (l.Bottom < 0 || l.Top > 1 || l.Top - l.Bottom < MinLabelHeight) return "Die Etikettenhöhe liegt nicht auf der Flasche.";
        if (l.WidthFraction is < MinLabelWidth or > MaxLabelWidth) return "Die Etikettenbreite ist ungültig.";
        if (Math.Abs(l.CenterAngle) > Math.PI) return "Der Winkel des Etiketts ist ungültig.";
        if (Outline is not null && !OutlineIsPlausible(Outline)) return "Der Flaschenumriss ist ungültig.";
        return null;
    }

    public bool IsPlausible() => Problem() is null;

    public void EnsurePlausible()
    {
        if (Problem() is { } problem) throw new DomainException(problem);
    }

    /// <summary>Enough points, all inside the photo, and a plausible share of the photo.</summary>
    public static bool OutlineIsPlausible(IReadOnlyList<LabelPoint> outline)
    {
        if (outline.Count is < MinOutlinePoints or > MaxOutlinePoints) return false;
        if (outline.Any(p => !double.IsFinite(p.X) || !double.IsFinite(p.Y) || p.X < 0 || p.X > 1 || p.Y < 0 || p.Y > 1))
            return false;
        double sum = 0;
        for (var i = 0; i < outline.Count; i++)
        {
            var a = outline[i];
            var b = outline[(i + 1) % outline.Count];
            sum += a.X * b.Y - b.X * a.Y;
        }
        return Math.Abs(sum) / 2 >= 0.01;
    }
}

/// <summary>What the agent saw of the whole bottle on the front photo.</summary>
/// <param name="Outline">Polygon of the bottle's silhouette from base to mouth, normalized 0..1.</param>
/// <param name="IsComplete">Mouth and base are both inside the photo.</param>
public sealed record BottleDetection(IReadOnlyList<LabelPoint> Outline, bool IsComplete);
