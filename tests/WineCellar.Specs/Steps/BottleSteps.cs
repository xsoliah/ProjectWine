using Microsoft.EntityFrameworkCore;
using Reqnroll;
using SkiaSharp;
using WineCellar.Application;
using WineCellar.Application.Capture;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class BottleSteps(TestWorld world)
{
    private Guid? _oldBottleImageId;
    private Guid? _annasBottleImageId;
    private BottleShape? _before;

    // ----- The simulated agent sees a bottle -----

    [Given(@"der Agent erkennt die ganze Flasche")]
    public void GivenWholeBottle() => world.Agent.Result = world.Agent.Result with
    {
        Bottle = new BottleDetection(TestBottle.Outline(), IsComplete: true),
        LabelCorners = TestBottle.Label(),
    };

    [Given(@"der Agent erkennt eine abgeschnittene Flasche")]
    public void GivenCutOffBottle() => world.Agent.Result = world.Agent.Result with
    {
        Bottle = new BottleDetection(TestBottle.Outline(), IsComplete: false),
        LabelCorners = TestBottle.Label(),
    };

    [Given(@"der Agent erkennt keinen Flaschenumriss")]
    public void GivenNoOutline() => world.Agent.Result = world.Agent.Result with
    {
        Bottle = null,
        LabelCorners = TestBottle.Label(),
    };

    // ----- Capturing a bottle -----

    [Given(@"ich habe ein Foto einer Flasche aufgenommen")]
    public async Task GivenBottleCaptured() =>
        world.LastDraft = await world.Captures.CreateAsync(TestBottle.Photo(), null, 1, null);

    [When(@"ich im Entwurf die Etikettenlage nach oben schiebe")]
    public async Task WhenDraftLabelUp()
    {
        var detail = await world.Captures.GetAsync(world.LastDraft!.Id);
        _before = detail.BottleShape;
        _oldBottleImageId = detail.BottleImageId;
        await world.Captures.SetBottleShapeAsync(world.LastDraft.Id, new SetBottleShapeRequest(null, Up(detail.BottleShape!.Label)));
    }

    [When(@"ich im Entwurf den Flaschenumriss bestätige")]
    public async Task WhenDraftOutline()
    {
        var detail = await world.Captures.GetAsync(world.LastDraft!.Id);
        _before = detail.BottleShape;
        await world.Captures.SetBottleShapeAsync(world.LastDraft.Id,
            new SetBottleShapeRequest(Dto(TestBottle.Outline()), detail.BottleShape!.Label));
    }

    [Then(@"enthält der Entwurf Flaschenumriss und Etikettenlage")]
    public async Task ThenDraftHasShape()
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        Assert.NotNull(d.BottleShape?.Outline);
        Assert.False(d.BottleShape!.NeedsReview);
    }

    [Then(@"die Etikettenhöhe im Verhältnis zur Flaschenhöhe entspricht dem Foto")]
    public async Task ThenLabelHeight()
    {
        var label = (await world.Captures.GetAsync(world.LastDraft!.Id)).BottleShape!.Label;
        Assert.Equal(0.5, label.Top, 0.03);
        Assert.Equal(0.155, label.Bottom, 0.03);
        Assert.Equal(0, label.CenterAngle, 0.05);
        // The label is 112 px wide, the body 268 px (diameter of 0.124 of the 1080 px bottle height).
        Assert.InRange(label.WidthFraction, 0.38, 0.46);
    }

    [Then(@"der Entwurf zeigt eine freigestellte Flasche mit dem Etikett in Originalgröße")]
    public async Task ThenCutOut()
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        var image = await world.Images.GetAsync(d.BottleImageId!.Value);
        Assert.Equal("image/png", image.ContentType);
        using var bitmap = SKBitmap.Decode(image.Data);
        Assert.True(Math.Max(bitmap.Width, bitmap.Height) <= BottleImageFormat.MaxEdge);
        // Transparent outside of the bottle (corner), opaque glass inside.
        Assert.Equal(0, bitmap.GetPixel(0, 0).Alpha);
        Assert.Equal(255, bitmap.GetPixel(bitmap.Width / 2, bitmap.Height / 2).Alpha);
        // No tabletop or background colour anywhere.
        for (var y = 0; y < bitmap.Height; y += 7)
        for (var x = 0; x < bitmap.Width; x += 7)
        {
            var c = bitmap.GetPixel(x, y);
            Assert.False(c.Alpha > 250 && TestImages.IsBackground(c), $"background at {x},{y}");
        }
        // The label keeps its pixel size: 0.14 of the photo width.
        var cropTop = (int)Math.Floor(TestBottle.Outline().Min(p => p.Y) * TestBottle.Height);
        var scanY = (int)(0.65 * TestBottle.Height) - cropTop;
        var reds = Enumerable.Range(0, bitmap.Width).Count(x => IsPaper(bitmap.GetPixel(x, scanY)));
        Assert.InRange(reds, (int)(0.14 * TestBottle.Width) - 4, (int)(0.14 * TestBottle.Width) + 4);
    }

    [Then(@"der Entwurf zeigt den Hinweis ""Flasche prüfen"" mit einer Standardflasche")]
    public async Task ThenReview()
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        Assert.True(d.BottleShape!.NeedsReview);
        Assert.Null(d.BottleShape.Outline);
        Assert.Equal(BottleShape.Standard().Profile, d.BottleShape.Profile);
        Assert.Equal(BottleShape.StandardLabel, d.BottleShape.Label);
    }

    [Then(@"der Entwurf hat noch kein Flaschenbild")]
    public async Task ThenNoDraftImage() => Assert.Null((await world.Captures.GetAsync(world.LastDraft!.Id)).BottleImageId);

    [Then(@"der Entwurf hat ein Flaschenbild und keinen Hinweis ""Flasche prüfen"" mehr")]
    public async Task ThenConfirmed()
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        Assert.NotNull(d.BottleImageId);
        Assert.False(d.BottleShape!.NeedsReview);
        Assert.NotNull(d.BottleShape.Outline);
    }

    [Then(@"sitzt das Etikett im Entwurf höher")]
    public async Task ThenDraftHigher()
    {
        var after = (await world.Captures.GetAsync(world.LastDraft!.Id)).BottleShape!;
        Assert.True(after.Label.Top > _before!.Label.Top);
        Assert.False(after.NeedsReview);
    }

    [Then(@"der Wein ""([^""]*)"" hat Flaschenmaß und Flaschenbild des Entwurfs")]
    public async Task ThenWineHasBottle(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotNull(wine.BottleShape?.Outline);
        Assert.NotNull(wine.BottleImageId);
        Assert.True(await world.Db.StoredImages.AnyAsync(i => i.Id == wine.BottleImageId));
    }

    // ----- Bottle of a wine -----

    [Given(@"""([^""]*)"" hat ein Originalfoto einer Flasche")]
    public async Task GivenBottlePhoto(string name)
    {
        var wine = await world.LabelImages.SetAsync((await world.FindWineAsync(name)).Id, TestBottle.Photo(), Dto(TestBottle.Label().Points));
        _annasBottleImageId = wine.BottleImageId;
    }

    [Given(@"""([^""]*)"" hat ein Flaschenmaß")]
    public async Task GivenShape(string name)
    {
        var id = (await world.FindWineAsync(name)).Id;
        var wine = await world.BottleShapes.SetAsync(id, new SetBottleShapeRequest(Dto(TestBottle.Outline()), BottleShape.StandardLabel));
        _annasBottleImageId = wine.BottleImageId;
        _oldBottleImageId = wine.BottleImageId;
        _before = wine.BottleShape;
    }

    [When(@"ich bei ""([^""]*)"" ""Flasche erkennen"" wähle")]
    public async Task WhenDetect(string name)
    {
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.BottleShapes.DetectAsync(id));
    }

    [When(@"ich bei ""([^""]*)"" die Etikettenlage nach oben schiebe")]
    public async Task WhenLabelUp(string name)
    {
        var wine = await world.FindWineAsync(name);
        _before = wine.BottleShape;
        await world.BottleShapes.SetAsync(wine.Id, new SetBottleShapeRequest(null, Up(wine.BottleShape!.Label)));
    }

    [When(@"ich bei ""([^""]*)"" einen schmaleren Flaschenumriss bestätige")]
    public async Task WhenNarrower(string name)
    {
        var wine = await world.FindWineAsync(name);
        _before = wine.BottleShape;
        _oldBottleImageId = wine.BottleImageId;
        var narrower = TestBottle.Outline().Select(p => new LabelPoint(0.5 + (p.X - 0.5) * 0.9, p.Y)).ToList();
        await world.BottleShapes.SetAsync(wine.Id, new SetBottleShapeRequest(Dto(narrower), wine.BottleShape!.Label));
    }

    [When(@"ich bei ""([^""]*)"" einen Flaschenumriss mit nur 3 Punkten bestätige")]
    public async Task WhenBadOutline(string name)
    {
        var wine = await world.FindWineAsync(name);
        await world.TryAsync(async () => await world.BottleShapes.SetAsync(wine.Id,
            new SetBottleShapeRequest([new(0.2, 0.2), new(0.8, 0.2), new(0.5, 0.9)], wine.BottleShape!.Label)));
    }

    [When(@"ich Annas Flaschenbild abrufe")]
    public async Task WhenForeign() =>
        await world.TryAsync(async () => await world.Images.GetAsync(_annasBottleImageId!.Value));

    [Then(@"hat ""([^""]*)"" ein Flaschenmaß und ein Flaschenbild")]
    public async Task ThenWineShape(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotNull(wine.BottleShape?.Outline);
        Assert.False(wine.BottleShape!.NeedsReview);
        Assert.NotNull(wine.BottleImageId);
    }

    [Then(@"hat ""([^""]*)"" eine Standardflasche zum Prüfen und kein Flaschenbild")]
    public async Task ThenWineStandard(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.True(wine.BottleShape!.NeedsReview);
        Assert.Null(wine.BottleImageId);
    }

    [Then(@"sitzt das Etikett von ""([^""]*)"" höher")]
    public async Task ThenWineHigher(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.True(wine.BottleShape!.Label.Top > _before!.Label.Top);
        Assert.False(wine.BottleShape.NeedsReview);
    }

    [Then(@"hat ""([^""]*)"" ein neues, schmaleres Flaschenbild")]
    public async Task ThenNarrower(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.NotEqual(_oldBottleImageId, wine.BottleImageId);
        Assert.False(await world.Db.StoredImages.AnyAsync(i => i.Id == _oldBottleImageId));
        Assert.True(wine.BottleShape!.Profile.Max(p => p.Radius) < _before!.Profile.Max(p => p.Radius));
    }

    [Then(@"der Agent wurde nicht aufgerufen")]
    public void ThenNoAgentCall() => Assert.Equal(0, world.Agent.Calls);

    [Then(@"der Agent hat nur nach der Flasche gesucht")]
    public void ThenBottleOnly() => Assert.Equal(1, world.Agent.BottleOnlyCalls);

    // ----- helpers -----

    private static BottleLabelPlacement Up(BottleLabelPlacement l) => l with { Top = l.Top + 0.1, Bottom = l.Bottom + 0.1 };

    private static bool IsPaper(SKColor c) => c.Red > 170 && c.Green < 90 && c.Blue < 90;

    private static IReadOnlyList<LabelPointDto> Dto(IEnumerable<LabelPoint> points) => points.Select(p => new LabelPointDto(p.X, p.Y)).ToList();
}
