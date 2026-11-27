using SkiaSharp;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Specs.Support;

/// <summary>Simulated research agent: configurable answer, failures and calls (no real API call in tests).</summary>
public sealed class FakeResearchAgent : IWineResearchAgent
{
    private readonly Queue<Exception> _failures = new();

    public WineResearchResult Result { get; set; } = new() { Summary = "Testwein erkannt." };
    public int Calls { get; private set; }
    public string? KnownBarcode { get; private set; }

    /// <summary>Calls that only looked for the bottle (detecting the bottle of an existing wine).</summary>
    public int BottleOnlyCalls { get; private set; }

    /// <summary>Text-only calls that estimated the drinking curve of an existing wine.</summary>
    public int CurveCalls { get; private set; }

    public string? LastHint { get; private set; }

    /// <summary>Runs during the research, e.g. to discard the draft in the meantime.</summary>
    public Func<Task>? During { get; set; }

    public void FailNext(int times, bool transient)
    {
        for (var i = 0; i < times; i++)
            _failures.Enqueue(new WineResearchException(
                transient ? "Der KI-Dienst ist gerade überlastet." : "Die Anfrage wurde abgelehnt.", transient));
    }

    public async Task<WineResearchResult> ResearchAsync(IReadOnlyList<ResearchImage> images, string? hint, string? knownBarcode, CancellationToken ct, bool bottleOnly = false, bool curveOnly = false)
    {
        Calls++;
        if (bottleOnly) BottleOnlyCalls++;        if (curveOnly) { CurveCalls++; LastHint = hint; }
        KnownBarcode = knownBarcode;
        if (During is { } during) await during();
        if (_failures.TryDequeue(out var failure)) throw failure;
        return Result;
    }
}

public sealed class FakeCaptureAvailability : ICaptureAvailability
{
    public bool IsEnabled { get; set; } = true;
}

public sealed class FakeCaptureQueue : ICaptureQueue
{
    public int Notifications { get; private set; }
    public void Notify() => Notifications++;
}

/// <summary>A synthetic bottle photo: a Bordeaux bottle with a red label on a green background.</summary>
public static class TestBottle
{
    public const int Width = 800;
    public const int Height = 1200;
    public const double Aspect = (double)Width / Height;

    /// <summary>Mouth at 5 % and base at 95 % of the photo height, centred.</summary>
    private const double MouthY = 0.05;
    private const double BaseY = 0.95;

    public static readonly SKColor Glass = new(70, 45, 25);

    /// <summary>Silhouette from the base up the left side and down the right side (the standard bottle's shape).</summary>
    public static IReadOnlyList<LabelPoint> Outline()
    {
        var profile = BottleShape.Standard().Profile;
        LabelPoint At(BottleProfilePoint p, int side) =>
            new(0.5 + side * p.Radius * (BaseY - MouthY) / Aspect, BaseY - p.Height * (BaseY - MouthY));
        return profile.Select(p => At(p, -1)).Concat(profile.Reverse().Select(p => At(p, 1))).ToList();
    }

    /// <summary>Label between 15.5 % and 50 % of the bottle height, 0.14 of the photo width, centred.</summary>
    public static LabelCorners Label()
    {
        var top = BaseY - 0.5 * (BaseY - MouthY);
        var bottom = BaseY - 0.155 * (BaseY - MouthY);
        return new LabelCorners(new(0.43, top), new(0.57, top), new(0.57, bottom), new(0.43, bottom));
    }

    public static byte[] Photo()
    {
        using var bitmap = new SKBitmap(Width, Height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(TestImages.Background);
            static SKPoint[] Pixels(IEnumerable<LabelPoint> points) =>
                points.Select(p => new SKPoint((float)(p.X * Width), (float)(p.Y * Height))).ToArray();
            using var glass = new SKPath();
            glass.AddPoly(Pixels(Outline()), close: true);
            using var glassPaint = new SKPaint { Color = Glass, IsAntialias = true };
            canvas.DrawPath(glass, glassPaint);
            using var label = new SKPath();
            label.AddPoly(Pixels(Label().Points), close: true);
            using var paper = new SKPaint { Color = TestImages.Paper, IsAntialias = false };
            canvas.DrawPath(label, paper);
        }
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}

/// <summary>Synthetic photos: a coloured label (with a stripe in the middle) on a differently coloured background.</summary>
public static class TestImages
{
    public static readonly SKColor Background = new(30, 160, 60);
    public static readonly SKColor Paper = new(220, 40, 40);
    public static readonly SKColor Stripe = new(30, 40, 200);

    /// <summary>Default label photo: a slightly tilted, portrait label in the middle of a 1000 x 800 photo.</summary>
    public static (byte[] Photo, LabelCorners Corners) LabelPhoto() =>
        Photo(1000, 800, new LabelCorners(new(0.38, 0.2), new(0.62, 0.23), new(0.61, 0.82), new(0.37, 0.8)));

    /// <summary>A photo with the label drawn exactly at the given corners.</summary>
    public static (byte[] Photo, LabelCorners Corners) Photo(int width, int height, LabelCorners corners, bool png = false)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(Background);
            var points = corners.Points.Select(p => new SKPoint((float)(p.X * width), (float)(p.Y * height))).ToArray();
            using var path = new SKPath();
            path.AddPoly(points, close: true);
            using var paper = new SKPaint { Color = Paper, IsAntialias = true };
            canvas.DrawPath(path, paper);

            // Vertical stripe through the middle of the label (between 40 % and 60 % of its width).
            static SKPoint Lerp(SKPoint a, SKPoint b, float t) => new(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t);
            using var stripe = new SKPath();
            stripe.AddPoly(
            [
                Lerp(points[0], points[1], 0.4f), Lerp(points[0], points[1], 0.6f),
                Lerp(points[3], points[2], 0.6f), Lerp(points[3], points[2], 0.4f),
            ], close: true);
            using var stripePaint = new SKPaint { Color = Stripe, IsAntialias = true };
            canvas.DrawPath(stripe, stripePaint);
        }
        using var image = SKImage.FromBitmap(bitmap);
        using var data = png ? image.Encode(SKEncodedImageFormat.Png, 100) : image.Encode(SKEncodedImageFormat.Jpeg, 92);
        return (data.ToArray(), corners);
    }

    public static SKBitmap Decode(byte[] jpeg) => SKBitmap.Decode(jpeg);

    /// <summary>Whether a pixel looks like the green background (allowing for JPEG noise).</summary>
    public static bool IsBackground(SKColor c) => c.Green > 110 && c.Red < 110 && c.Blue < 120;
}
