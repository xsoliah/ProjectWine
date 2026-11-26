using SkiaSharp;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Infrastructure.Imaging;

/// <summary>
/// Cuts the label out of a photo with SkiaSharp: corners pulled 2 % inwards (better a thin label edge less than
/// background), perspective rectified to the label's own aspect ratio, fitted into 900 x 1200 (3:4) without
/// distortion; free space is filled with the label's paper colour. Output: JPEG, quality 85.
/// </summary>
public class SkiaLabelImageExtractor : ILabelImageExtractor
{
    /// <summary>Share of each edge the corners are moved inwards.</summary>
    public const double Inset = 0.02;

    /// <summary>Labels within this relative deviation from 3:4 fill the whole image (no thin bars).</summary>
    public const double FillTolerance = 0.03;

    public const int JpegQuality = 85;

    public byte[] Extract(byte[] photo, LabelCorners corners)
    {
        using var source = Decode(photo);
        var (w, h) = (source.Width, source.Height);

        // Quad in pixels, then the inset quad: map the unit square onto the quad and take [Inset, 1 - Inset].
        var quad = corners.Points.Select(p => (p.X * w, p.Y * h)).ToList();
        var unit = new List<(double, double)> { (0, 0), (1, 0), (1, 1), (0, 1) };
        var unitToQuad = Homography.FromPoints(unit, quad);
        var inner = new List<(double X, double Y)>
        {
            Homography.Map(unitToQuad, Inset, Inset),
            Homography.Map(unitToQuad, 1 - Inset, Inset),
            Homography.Map(unitToQuad, 1 - Inset, 1 - Inset),
            Homography.Map(unitToQuad, Inset, 1 - Inset)
        };

        // Natural size of the label from the mean lengths of opposite edges.
        var labelWidth = (Distance(inner[0], inner[1]) + Distance(inner[3], inner[2])) / 2;
        var labelHeight = (Distance(inner[0], inner[3]) + Distance(inner[1], inner[2])) / 2;
        if (labelWidth < 4 || labelHeight < 4) throw new DomainException("Das ausgewählte Etikett ist zu klein.");
        var (drawWidth, drawHeight) = FitSize(labelWidth / labelHeight);

        using var label = Rectify(source, inner, drawWidth, drawHeight);
        var paper = PaperColor(label);

        using var target = new SKBitmap(new SKImageInfo(LabelImageFormat.Width, LabelImageFormat.Height, SKColorType.Rgba8888, SKAlphaType.Opaque));
        using (var canvas = new SKCanvas(target))
        {
            canvas.Clear(paper);
            canvas.DrawBitmap(label, (LabelImageFormat.Width - drawWidth) / 2f, (LabelImageFormat.Height - drawHeight) / 2f);
        }
        using var image = SKImage.FromBitmap(target);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
        return data.ToArray();
    }

    /// <summary>Size of the label inside 900 x 1200: proportional, as large as possible; near 3:4 fills completely.</summary>
    public static (int Width, int Height) FitSize(double aspect)
    {
        const double target = (double)LabelImageFormat.Width / LabelImageFormat.Height;
        if (Math.Abs(aspect - target) / target <= FillTolerance) return (LabelImageFormat.Width, LabelImageFormat.Height);
        return aspect > target
            ? (LabelImageFormat.Width, Math.Max(1, (int)Math.Round(LabelImageFormat.Width / aspect)))
            : (Math.Max(1, (int)Math.Round(LabelImageFormat.Height * aspect)), LabelImageFormat.Height);
    }

    /// <summary>Draws the photo with a perspective matrix that maps the inner quad exactly onto the output rectangle.</summary>
    private static SKBitmap Rectify(SKBitmap source, IReadOnlyList<(double X, double Y)> quad, int width, int height)
    {
        var rect = new List<(double, double)> { (0, 0), (width, 0), (width, height), (0, height) };
        var m = Homography.FromPoints(quad, rect);
        var matrix = new SKMatrix
        {
            ScaleX = (float)m[0], SkewX = (float)m[1], TransX = (float)m[2],
            SkewY = (float)m[3], ScaleY = (float)m[4], TransY = (float)m[5],
            Persp0 = (float)m[6], Persp1 = (float)m[7], Persp2 = (float)m[8]
        };

        var result = new SKBitmap(new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Opaque));
        using var canvas = new SKCanvas(result);
        canvas.Clear(SKColors.White);
        canvas.ClipRect(new SKRect(0, 0, width, height)); // only the label area, nothing around it
        canvas.SetMatrix(matrix);
        using var image = SKImage.FromBitmap(source);
        canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear));
        return result;
    }

    /// <summary>Mean colour of a thin strip along the edge of the rectified label (its paper).</summary>
    private static SKColor PaperColor(SKBitmap label)
    {
        var band = Math.Max(1, Math.Min(label.Width, label.Height) / 30);
        long r = 0, g = 0, b = 0, n = 0;
        var step = Math.Max(1, Math.Max(label.Width, label.Height) / 300);
        for (var y = 0; y < label.Height; y += step)
        for (var x = 0; x < label.Width; x += step)
        {
            if (x >= band && x < label.Width - band && y >= band && y < label.Height - band) continue;
            var c = label.GetPixel(x, y);
            r += c.Red; g += c.Green; b += c.Blue; n++;
        }
        return n == 0 ? SKColors.White : new SKColor((byte)(r / n), (byte)(g / n), (byte)(b / n));
    }

    /// <summary>Decodes the photo and applies the EXIF orientation.</summary>
    internal static SKBitmap Decode(byte[] photo)
    {
        using var stream = new SKMemoryStream(photo);
        using var codec = SKCodec.Create(stream) ?? throw new DomainException("Das Foto kann nicht gelesen werden.");
        var decoded = SKBitmap.Decode(codec) ?? throw new DomainException("Das Foto kann nicht gelesen werden.");
        if (codec.EncodedOrigin is SKEncodedOrigin.TopLeft or SKEncodedOrigin.Default) return decoded;

        using (decoded)
        {
            var rotate90 = codec.EncodedOrigin is SKEncodedOrigin.RightTop or SKEncodedOrigin.LeftBottom
                or SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightBottom;
            var info = rotate90
                ? new SKImageInfo(decoded.Height, decoded.Width, decoded.ColorType, decoded.AlphaType)
                : decoded.Info;
            var upright = new SKBitmap(info);
            using var canvas = new SKCanvas(upright);
            switch (codec.EncodedOrigin)
            {
                case SKEncodedOrigin.BottomRight:
                    canvas.RotateDegrees(180, decoded.Width / 2f, decoded.Height / 2f);
                    break;
                case SKEncodedOrigin.RightTop:
                    canvas.Translate(decoded.Height, 0);
                    canvas.RotateDegrees(90);
                    break;
                case SKEncodedOrigin.LeftBottom:
                    canvas.Translate(0, decoded.Width);
                    canvas.RotateDegrees(270);
                    break;
                // Mirrored orientations are rare for camera photos; they are drawn unmirrored.
            }
            canvas.DrawBitmap(decoded, 0, 0);
            return upright;
        }
    }

    private static double Distance((double X, double Y) a, (double X, double Y) b) =>
        Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));
}
