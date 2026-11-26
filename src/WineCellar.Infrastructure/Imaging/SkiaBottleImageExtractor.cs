using SkiaSharp;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Infrastructure.Imaging;

/// <summary>
/// Cuts the bottle out of a photo with SkiaSharp: the photo is cropped to the bounding box of the outline and
/// everything outside the outline polygon becomes transparent. Pixels are not stretched, so the label keeps its
/// size; only a crop larger than <see cref="BottleImageFormat.MaxEdge"/> is scaled down proportionally. Output: PNG.
/// </summary>
public class SkiaBottleImageExtractor : IBottleImageExtractor
{
    public (int Width, int Height) ReadSize(byte[] photo)
    {
        using var bitmap = SkiaLabelImageExtractor.Decode(photo);
        return (bitmap.Width, bitmap.Height);
    }

    public byte[] Extract(byte[] photo, IReadOnlyList<LabelPoint> outline)
    {
        if (!BottleShape.OutlineIsPlausible(outline)) throw new DomainException("Der Flaschenumriss ist ungültig.");
        using var source = SkiaLabelImageExtractor.Decode(photo);

        var points = outline.Select(p => new SKPoint((float)(p.X * source.Width), (float)(p.Y * source.Height))).ToArray();
        var left = (int)Math.Floor(points.Min(p => p.X));
        var top = (int)Math.Floor(points.Min(p => p.Y));
        var right = Math.Min(source.Width, (int)Math.Ceiling(points.Max(p => p.X)));
        var bottom = Math.Min(source.Height, (int)Math.Ceiling(points.Max(p => p.Y)));
        var cropWidth = right - left;
        var cropHeight = bottom - top;
        if (cropWidth < 4 || cropHeight < 4) throw new DomainException("Die ausgewählte Flasche ist zu klein.");

        var scale = Math.Min(1.0, (double)BottleImageFormat.MaxEdge / Math.Max(cropWidth, cropHeight));
        var width = Math.Max(1, (int)Math.Round(cropWidth * scale));
        var height = Math.Max(1, (int)Math.Round(cropHeight * scale));

        using var target = new SKBitmap(new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Premul));
        using (var canvas = new SKCanvas(target))
        {
            canvas.Clear(SKColors.Transparent);
            canvas.Scale((float)scale);
            canvas.Translate(-left, -top);
            using var path = new SKPath();
            path.AddPoly(points, close: true);
            canvas.ClipPath(path, SKClipOperation.Intersect, antialias: true);
            using var image = SKImage.FromBitmap(source);
            canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear));
        }
        using var result = SKImage.FromBitmap(target);
        using var data = result.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
