using SkiaSharp;
using WineCellar.Domain;
using WineCellar.Infrastructure.Imaging;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Unit;

public class HomographyTests
{
    [Fact]
    public void Maps_each_source_corner_onto_its_destination()
    {
        var src = new List<(double, double)> { (120, 80), (610, 140), (580, 700), (90, 650) };
        var dst = new List<(double, double)> { (0, 0), (900, 0), (900, 1200), (0, 1200) };
        var h = Homography.FromPoints(src, dst);
        for (var i = 0; i < 4; i++)
        {
            var (x, y) = Homography.Map(h, src[i].Item1, src[i].Item2);
            Assert.Equal(dst[i].Item1, x, 6);
            Assert.Equal(dst[i].Item2, y, 6);
        }
    }

    [Fact]
    public void Rejects_degenerate_quadrilaterals()
    {
        var line = new List<(double, double)> { (0, 0), (1, 1), (2, 2), (3, 3) };
        var rect = new List<(double, double)> { (0, 0), (1, 0), (1, 1), (0, 1) };
        Assert.Throws<ArgumentException>(() => Homography.FromPoints(line, rect));
    }
}

public class LabelCornersTests
{
    [Fact]
    public void Centered_default_is_plausible() => Assert.True(LabelCorners.Centered.IsPlausible());

    [Fact]
    public void Stored_json_is_short_rounded_and_round_trips()
    {
        var corners = new LabelCorners(new(0.3613569858407528, 0.2738647734840832), new(0.6236470138392594, 0.2599),
            new(0.64, 0.7312345678), new(0.38, 0.74));
        var json = WineCellar.Application.Capture.LabelCornersJson.Serialize(corners);
        Assert.DoesNotContain("points", json, StringComparison.OrdinalIgnoreCase);
        Assert.True(json.Length < 300, json);
        var back = WineCellar.Application.Capture.LabelCornersJson.Deserialize(json)!;
        Assert.Equal(0.3614, back.TopLeft.X);
        Assert.Equal(0.7312, back.BottomRight.Y);
    }

    [Theory]
    [InlineData(-0.1, 0.1, 0.9, 0.1, 0.9, 0.9, 0.1, 0.9)] // outside the photo
    [InlineData(0.1, 0.1, 0.1, 0.9, 0.9, 0.9, 0.9, 0.1)] // counter-clockwise
    [InlineData(0.1, 0.1, 0.9, 0.9, 0.9, 0.1, 0.1, 0.9)] // self-intersecting
    [InlineData(0.5, 0.5, 0.55, 0.5, 0.55, 0.55, 0.5, 0.55)] // smaller than 2 % of the photo
    public void Implausible_corners_are_rejected(double a, double b, double c, double d, double e, double f, double g, double h) =>
        Assert.False(new LabelCorners(new(a, b), new(c, d), new(e, f), new(g, h)).IsPlausible());
}

public class LabelExtractorTests
{
    private readonly SkiaLabelImageExtractor _extractor = new();

    [Fact]
    public void Tilted_label_on_background_gives_900x1200_without_a_single_background_pixel()
    {
        var (photo, corners) = TestImages.LabelPhoto();
        using var result = TestImages.Decode(_extractor.Extract(photo, corners));

        Assert.Equal((900, 1200), (result.Width, result.Height));
        for (var y = 0; y < result.Height; y++)
        for (var x = 0; x < result.Width; x++)
            Assert.False(TestImages.IsBackground(result.GetPixel(x, y)), $"Hintergrundpixel bei ({x}, {y})");
    }

    [Fact]
    public void Label_in_portrait_3_to_4_fills_the_whole_image()
    {
        // 300 x 400 px label in a 1000 x 1000 photo: exactly 3:4.
        var (photo, corners) = TestImages.Photo(1000, 1000,
            new LabelCorners(new(0.35, 0.3), new(0.65, 0.3), new(0.65, 0.7), new(0.35, 0.7)));
        using var result = TestImages.Decode(_extractor.Extract(photo, corners));

        // Corners and edge centres are paper (red), the middle is the stripe (blue): no bars anywhere.
        foreach (var (x, y) in new[] { (5, 5), (894, 5), (5, 1194), (894, 1194), (5, 600), (894, 600), (200, 5), (700, 1194) })
            AssertNear(TestImages.Paper, result.GetPixel(x, y));
        AssertNear(TestImages.Stripe, result.GetPixel(450, 600));
    }

    [Fact]
    public void Wide_label_is_complete_and_undistorted_with_single_colour_bars()
    {
        // 600 x 300 px label (2:1): drawn 900 x 450, bars of 375 px above and below.
        var (photo, corners) = TestImages.Photo(1000, 1000,
            new LabelCorners(new(0.2, 0.35), new(0.8, 0.35), new(0.8, 0.65), new(0.2, 0.65)));
        using var result = TestImages.Decode(_extractor.Extract(photo, corners));
        Assert.Equal((900, 1200), (result.Width, result.Height));

        // Bars: one colour (the paper), no stripe and no background.
        foreach (var y in new[] { 10, 200, 360, 840, 1000, 1190 })
        foreach (var x in new[] { 10, 450, 890 })
            AssertNear(TestImages.Paper, result.GetPixel(x, y));

        // Label area: the stripe sits in the middle third of the width, over the full label height (450 px).
        AssertNear(TestImages.Stripe, result.GetPixel(450, 400));
        AssertNear(TestImages.Stripe, result.GetPixel(450, 800));
        AssertNear(TestImages.Paper, result.GetPixel(300, 600));
        AssertNear(TestImages.Paper, result.GetPixel(600, 600));

        // Undistorted: the stripe is 20 % of the label width, i.e. about 180 px of 900.
        var stripeWidth = Enumerable.Range(0, 900).Count(x => IsNear(TestImages.Stripe, result.GetPixel(x, 600)));
        Assert.InRange(stripeWidth, 165, 195);
    }

    [Theory]
    [InlineData(0.75, 900, 1200)]  // exactly 3:4
    [InlineData(0.76, 900, 1200)]  // within tolerance: fills
    [InlineData(2.0, 900, 450)]    // wide: full width
    [InlineData(0.5, 600, 1200)]   // tall: full height
    public void Fit_size_keeps_proportions(double aspect, int width, int height) =>
        Assert.Equal((width, height), SkiaLabelImageExtractor.FitSize(aspect));

    [Fact]
    public void Unreadable_photo_is_rejected() =>
        Assert.Throws<DomainException>(() => _extractor.Extract([0xFF, 0xD8, 0xFF, 0x00, 0x01], LabelCorners.Centered));

    private static bool IsNear(SKColor expected, SKColor actual, int tolerance = 45) =>
        Math.Abs(expected.Red - actual.Red) <= tolerance &&
        Math.Abs(expected.Green - actual.Green) <= tolerance &&
        Math.Abs(expected.Blue - actual.Blue) <= tolerance;

    private static void AssertNear(SKColor expected, SKColor actual) =>
        Assert.True(IsNear(expected, actual), $"erwartet {expected}, gefunden {actual}");
}
