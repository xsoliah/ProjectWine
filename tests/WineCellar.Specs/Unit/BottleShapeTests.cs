using System.Text.Json;
using WineCellar.Application.Capture;
using WineCellar.Domain;
using WineCellar.Infrastructure.Research;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Unit;

/// <summary>Profile and label placement derived from a bottle outline; pure geometry, no images.</summary>
public class BottleShapeBuilderTests
{
    private static BottleShape Build(IReadOnlyList<LabelPoint>? outline = null, LabelCorners? label = null) =>
        BottleShapeBuilder.FromOutline(outline ?? TestBottle.Outline(), TestBottle.Aspect, label ?? TestBottle.Label())!;

    [Fact]
    public void Profile_follows_the_outline_from_base_to_mouth()
    {
        var shape = Build();
        Assert.Equal(BottleShapeBuilder.Rows, shape.Profile.Count);
        Assert.Equal(0, shape.Profile[0].Height);
        Assert.Equal(1, shape.Profile[^1].Height);
        // Body about 0.124 of the height, neck about 0.04.
        Assert.Equal(0.124, shape.Profile.Max(p => p.Radius), 0.01);
        Assert.Equal(0.041, shape.Profile[^3].Radius, 0.015);
        Assert.True(shape.IsPlausible());
        Assert.False(shape.NeedsReview);
    }

    [Fact]
    public void Left_and_right_side_are_averaged_into_one_radius()
    {
        // Shift the whole bottle sideways: same radii, still upright.
        var shifted = TestBottle.Outline().Select(p => new LabelPoint(p.X + 0.1, p.Y)).ToList();
        var a = Build();
        var b = Build(shifted, TestBottle.Label() with
        {
            TopLeft = new(0.53, TestBottle.Label().TopLeft.Y), TopRight = new(0.67, TestBottle.Label().TopRight.Y),
            BottomRight = new(0.67, TestBottle.Label().BottomRight.Y), BottomLeft = new(0.53, TestBottle.Label().BottomLeft.Y),
        });
        Assert.Equal(a.Profile.Select(p => p.Radius), b.Profile.Select(p => p.Radius));
        Assert.Equal(0, b.Label.CenterAngle, 0.05);
    }

    [Fact]
    public void Label_placement_matches_the_photo()
    {
        var label = Build().Label;
        Assert.Equal(0.5, label.Top, 0.02);
        Assert.Equal(0.155, label.Bottom, 0.02);
        Assert.Equal(0.418, label.WidthFraction, 0.03);
        Assert.Equal(0, label.CenterAngle, 0.03);
    }

    [Fact]
    public void An_off_centre_label_gets_a_turn_angle()
    {
        var l = TestBottle.Label();
        var right = new LabelCorners(new(l.TopLeft.X + 0.06, l.TopLeft.Y), new(l.TopRight.X + 0.06, l.TopRight.Y),
            new(l.BottomRight.X + 0.06, l.BottomRight.Y), new(l.BottomLeft.X + 0.06, l.BottomLeft.Y));
        var angle = Build(label: right).Label.CenterAngle;
        // 0.06 photo widths = 0.04 photo heights; body radius = 0.124 * 0.9 = 0.1116 -> asin(0.358) = 0.366.
        Assert.Equal(0.366, angle, 0.03);
    }

    [Fact]
    public void A_very_wide_label_is_limited_to_the_circumference()
    {
        var wide = new LabelCorners(new(0.02, 0.5), new(0.98, 0.5), new(0.98, 0.8), new(0.02, 0.8));
        var label = BottleShapeBuilder.FromOutline(TestBottle.Outline(), TestBottle.Aspect, wide)!.Label;
        Assert.True(label.WidthFraction <= BottleShape.MaxLabelWidth);
    }

    [Fact]
    public void Without_label_corners_the_label_is_estimated_and_flagged()
    {
        var shape = BottleShapeBuilder.FromOutline(TestBottle.Outline(), TestBottle.Aspect, null)!;
        Assert.True(shape.NeedsReview);
        Assert.Equal(BottleShape.StandardLabel, shape.Label);
    }

    [Fact]
    public void Smoothing_flattens_a_spike_and_keeps_the_ends()
    {
        var smooth = BottleShapeBuilder.Smooth([0.1, 0.1, 0.2, 0.1, 0.1]);
        Assert.Equal(0.1, smooth[0]);
        Assert.Equal(0.1, smooth[4]);
        Assert.True(smooth[2] < 0.2 && smooth[2] > 0.1);
    }

    [Fact]
    public void A_noisy_outline_gives_a_smoother_profile()
    {
        var random = new Random(7);
        var noisy = TestBottle.Outline().Select(p => new LabelPoint(p.X + (random.NextDouble() - 0.5) * 0.004, p.Y)).ToList();
        var profile = Build(noisy).Profile;
        var maxStep = profile.Zip(profile.Skip(1), (a, b) => Math.Abs(a.Radius - b.Radius)).Max();
        Assert.True(maxStep < 0.04, $"largest step {maxStep}");
    }

    [Fact]
    public void A_lying_bottle_is_rejected()
    {
        // Rotate the bottle by 90 degrees around the photo centre: wide instead of tall.
        var lying = TestBottle.Outline().Select(p => new LabelPoint(0.5 + (p.Y - 0.5) * 0.6, 0.5 + (p.X - 0.5))).ToList();
        Assert.Null(BottleShapeBuilder.FromOutline(lying, TestBottle.Aspect, TestBottle.Label()));
    }

    [Fact]
    public void A_tilted_bottle_is_rejected()
    {
        // Strong shear: the centre line drifts by half the bottle height.
        var tilted = TestBottle.Outline().Select(p => new LabelPoint(p.X + (0.5 - p.Y) * 0.5, p.Y)).ToList();
        Assert.Null(BottleShapeBuilder.FromOutline(tilted, TestBottle.Aspect, TestBottle.Label()));
    }

    [Fact]
    public void A_tiny_or_degenerate_outline_is_rejected()
    {
        var tiny = TestBottle.Outline().Select(p => new LabelPoint(0.5 + (p.X - 0.5) * 0.2, 0.5 + (p.Y - 0.5) * 0.2)).ToList();
        Assert.Null(BottleShapeBuilder.FromOutline(tiny, TestBottle.Aspect, null));
        Assert.Null(BottleShapeBuilder.FromOutline([new(0.1, 0.1), new(0.2, 0.2), new(0.3, 0.3)], TestBottle.Aspect, null));
        Assert.Null(BottleShapeBuilder.FromOutline(TestBottle.Outline(), 0, null));
    }

    [Fact]
    public void A_rectangle_is_not_a_bottle()
    {
        var box = new List<LabelPoint> { new(0.3, 0.1), new(0.3, 0.5), new(0.3, 0.9), new(0.7, 0.9), new(0.7, 0.5), new(0.7, 0.1) };
        // Four times as wide as a bottle and without a neck.
        Assert.Null(BottleShapeBuilder.FromOutline(box, TestBottle.Aspect, null));
    }
}

public class BottleShapeTests
{
    [Fact]
    public void The_standard_bottle_is_plausible_for_every_wine_type()
    {
        foreach (var type in Enum.GetValues<WineType>()) Assert.True(BottleShape.Standard(type).IsPlausible(), type.ToString());
    }

    [Fact]
    public void Sparkling_wine_is_stockier_than_red()
    {
        Assert.True(BottleShape.Standard(WineType.Sparkling).Profile.Max(p => p.Radius) > BottleShape.Standard(WineType.Red).Profile.Max(p => p.Radius));
    }

    [Theory]
    [InlineData(0.5, 0.5)]     // no height
    [InlineData(1.2, 0.2)]     // above the mouth
    [InlineData(0.5, -0.1)]    // below the base
    public void Label_heights_must_lie_on_the_bottle(double top, double bottom)
    {
        var shape = BottleShape.Standard() with { Label = new BottleLabelPlacement(top, bottom, 0.5, 0) };
        Assert.False(shape.IsPlausible());
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(3.3)]
    public void Label_width_is_limited_to_the_circumference(double width)
    {
        var shape = BottleShape.Standard() with { Label = new BottleLabelPlacement(0.5, 0.2, width, 0) };
        Assert.False(shape.IsPlausible());
    }

    [Fact]
    public void A_profile_with_falling_heights_is_rejected()
    {
        var standard = BottleShape.Standard();
        var broken = standard with { Profile = standard.Profile.Reverse().ToList() };
        Assert.False(broken.IsPlausible());
        Assert.Throws<DomainException>(broken.EnsurePlausible);
    }

    [Fact]
    public void Json_round_trips_and_unusable_json_yields_null()
    {
        var shape = BottleShape.Standard() with { Outline = TestBottle.Outline() };
        var json = BottleShapeJson.Serialize(shape);
        Assert.True(json.Length < 8000);
        var back = BottleShapeJson.Deserialize(json)!;
        Assert.Equal(shape.Profile.Count, back.Profile.Count);
        Assert.Equal(shape.Outline!.Count, back.Outline!.Count);
        Assert.Null(BottleShapeJson.Deserialize("{not json"));
        Assert.Null(BottleShapeJson.Deserialize("""{"profile":[],"label":{"top":0.5,"bottom":0.2,"widthFraction":0.5,"centerAngle":0}}"""));
        Assert.Null(BottleShapeJson.Deserialize(null));
    }
}

public class BottleResearchReaderTests
{
    private static WineResearchResult Read(string bottleJson) => ResearchResponseReader.Read("end_turn",
    [
        JsonDocument.Parse(JsonSerializer.Serialize(new
        {
            type = "text",
            text = $$"""{"isWineLabel":true,"summary":"x","bottle":{{bottleJson}}}""",
        })).RootElement,
    ]);

    [Fact]
    public void Reads_outline_and_completeness()
    {
        var r = Read("""{"outline":[{"x":0.4,"y":0.9},{"x":0.38,"y":0.5},{"x":0.45,"y":0.2},{"x":0.47,"y":0.05},{"x":0.53,"y":0.05},{"x":0.55,"y":0.2},{"x":0.62,"y":0.5},{"x":0.6,"y":0.9}],"isComplete":true}""");
        Assert.NotNull(r.Bottle);
        Assert.True(r.Bottle!.IsComplete);
        Assert.Equal(8, r.Bottle.Outline.Count);
    }

    [Fact]
    public void Null_and_missing_bottle_mean_no_silhouette()
    {
        Assert.Null(Read("null").Bottle);
        var withoutField = ResearchResponseReader.Read("end_turn",
            [JsonDocument.Parse("""{"type":"text","text":"{\"isWineLabel\":true,\"summary\":\"x\"}"}""").RootElement]);
        Assert.Null(withoutField.Bottle);
    }

    [Fact]
    public void Unusable_points_are_dropped_and_too_few_points_mean_no_silhouette()
    {
        Assert.Null(Read("""{"outline":[{"x":0.4,"y":0.9},{"x":"a","y":0.5},{"y":0.2}],"isComplete":true}""").Bottle);
        Assert.Null(Read("""{"outline":"nope","isComplete":true}""").Bottle);
    }

    [Fact]
    public void A_missing_completeness_flag_counts_as_incomplete()
    {
        var points = string.Join(",", Enumerable.Range(0, 8).Select(i => $$"""{"x":0.{{i + 1}},"y":0.{{i + 1}}}"""));
        Assert.False(Read($$"""{"outline":[{{points}}]}""").Bottle!.IsComplete);
    }

    [Fact]
    public void Implausible_outlines_are_dropped_by_the_sanitizer()
    {
        var outside = new WineResearchResult
        {
            Bottle = new BottleDetection([new(-1, 0), new(2, 0), new(2, 2), new(0, 2), new(0.5, 1), new(0.2, 0.3)], true),
        };
        Assert.Null(CaptureProcessor.Sanitize(outside, 2026).Bottle);
    }

    [Fact]
    public void The_schema_and_prompt_describe_the_bottle()
    {
        Assert.True(ResearchSchema.Schema.ContainsKey("properties"));
        Assert.Contains("\"bottle\"", ResearchSchema.PromptSection);
        Assert.Contains("isComplete", ResearchSchema.PromptSection);
        Assert.Contains("bottle:", ResearchPrompt.System);
    }

    [Fact]
    public void The_bottle_only_instruction_forbids_web_search()
    {
        var text = ResearchPrompt.UserInstruction(null, null, bottleOnly: true);
        Assert.Contains("Do not use web search", text);
        Assert.DoesNotContain("identify and research", text);
    }
}
