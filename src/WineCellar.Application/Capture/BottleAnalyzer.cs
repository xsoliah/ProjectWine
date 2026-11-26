using WineCellar.Domain;

namespace WineCellar.Application.Capture;

/// <summary>Cuts the bottle out of a photo along its outline (transparent background).</summary>
public interface IBottleImageExtractor
{
    /// <summary>Pixel size of the photo with the EXIF orientation applied.</summary>
    /// <exception cref="DomainException">The photo cannot be read.</exception>
    (int Width, int Height) ReadSize(byte[] photo);

    /// <summary>Returns the bottle as PNG: cropped to the outline's bounding box, longest edge at most <see cref="BottleImageFormat.MaxEdge"/>.</summary>
    /// <exception cref="DomainException">The photo cannot be read.</exception>
    byte[] Extract(byte[] photo, IReadOnlyList<LabelPoint> outline);
}

public static class BottleImageFormat
{
    public const int MaxEdge = 1600;
    public const string ContentType = "image/png";
}

/// <summary>Bottle measurements together with the cut-out bottle (null when there is no outline).</summary>
public sealed record BottleAnalysis(BottleShape Shape, byte[]? Image);

/// <summary>Turns what the agent saw (or what the user adjusted) into a bottle shape and a bottle image.</summary>
public class BottleAnalyzer(IBottleImageExtractor extractor)
{
    /// <summary>
    /// Detected bottle: shape from the outline and the label corners plus the cut-out. Without a complete, plausible
    /// bottle the standard bottle of the wine type is used, flagged for review, without a bottle image.
    /// </summary>
    public BottleAnalysis Analyze(byte[] photo, BottleDetection? detection, LabelCorners? label, WineType type)
    {
        if (detection is { IsComplete: true } found)
        {
            var (width, height) = extractor.ReadSize(photo);
            if (BottleShapeBuilder.FromOutline(found.Outline, (double)width / height, label) is { Outline: { } outline } shape)
                return new BottleAnalysis(shape, extractor.Extract(photo, outline));
        }
        return new BottleAnalysis(BottleShape.Standard(type) with { NeedsReview = true }, null);
    }

    /// <summary>
    /// The user's adjustment: a new outline (optional) and label placement. The profile follows the outline, the bottle
    /// image is cut again. Without an outline the existing profile is kept (and no image can be cut).
    /// </summary>
    /// <exception cref="DomainException">Outline or placement are implausible.</exception>
    public BottleAnalysis Adjust(byte[] photo, BottleShape? current, IReadOnlyList<LabelPoint>? outline, BottleLabelPlacement label, WineType type)
    {
        var profile = current?.Profile ?? BottleShape.Standard(type).Profile;
        var kept = current?.Outline;
        if (outline is not null)
        {
            if (!BottleShape.OutlineIsPlausible(outline))
                throw new DomainException("Der Flaschenumriss ist ungültig: Er braucht mindestens 6 Punkte im Bild und muss eine Fläche umschließen.");
            var (width, height) = extractor.ReadSize(photo);
            profile = BottleShapeBuilder.ProfileFromOutline(outline, (double)width / height)
                ?? throw new DomainException(
                    "Der Umriss passt nicht zu einer aufrecht stehenden Flasche: Er muss die ganze Flasche von der Mündung bis zum Boden umschließen.");
            kept = outline;
        }

        var shape = new BottleShape(profile, label, kept).Rounded();
        shape.EnsurePlausible();
        return new BottleAnalysis(shape, kept is null ? null : extractor.Extract(photo, kept));
    }
}
