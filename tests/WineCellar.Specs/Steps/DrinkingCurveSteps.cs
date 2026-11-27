using System.Globalization;
using Reqnroll;
using WineCellar.Application;
using WineCellar.Application.Capture;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class DrinkingCurveSteps(TestWorld world)
{
    private static double Number(string text) => double.Parse(text.Replace(',', '.'), CultureInfo.InvariantCulture);

    private static FieldSource Source(string text) => text switch
    {
        "aus dem Web" => FieldSource.Web,
        "geschätzt" => FieldSource.Estimate,
        "abgeleitet" => FieldSource.Derived,
        _ => throw new ArgumentException(text),
    };

    // ----- The wine -----

    [Given(@"ich habe den Wein ""([^""]*)"" mit (\d+) Flaschen")]
    public async Task GivenWine(string name, int quantity) => await world.SeedWineAsync(name, quantity);

    [When(@"ich den Wein ""([^""]*)"" mit Trinkzeitpunkt (\d+) und Streuung (-?[\d,]+) speichere")]
    public async Task WhenSave(string name, int peak, string spread) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(
            new SaveWineRequest(null, name, DrinkPeak: peak, DrinkSpread: Number(spread))));

    [When(@"ich den Wein ""([^""]*)"" mit Trinkzeitpunkt (\d+) ohne Streuung speichere")]
    public async Task WhenSaveWithoutSpread(string name, int peak) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(new SaveWineRequest(null, name, DrinkPeak: peak)));

    [Then(@"hat der Wein ""([^""]*)"" den Trinkzeitpunkt (\d+) mit Streuung ([\d,]+)")]
    public async Task ThenCurve(string name, int peak, string spread)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Equal(peak, wine.DrinkPeak);
        Assert.Equal(Number(spread), wine.DrinkSpread);
    }

    [Then(@"hat der Wein ""([^""]*)"" kein Trinkfenster")]
    public async Task ThenNoWindow(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Null(wine.DrinkFrom);
        Assert.Null(wine.DrinkUntil);
    }

    [Then(@"der Wein ""([^""]*)"" hat keine Trinkkurve")]
    public async Task ThenNoCurve(string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Null(wine.DrinkPeak);
        Assert.Null(wine.DrinkSpread);
    }

    // ----- The simulated agent -----

    [Given(@"der Agent ermittelt den Trinkzeitpunkt (\d+) mit Streuung ([\d,]+) (aus dem Web|geschätzt)")]
    public void GivenAgentCurve(int peak, string spread, string source) =>
        world.Agent.Result = world.Agent.Result with
        {
            DrinkPeak = new(peak, Source(source)),
            DrinkSpread = new(Number(spread), Source(source)),
        };

    // ----- The draft -----

    [Then(@"zeigt der Entwurf den Trinkzeitpunkt (\d+) mit Streuung ([\d,]+) (aus dem Web|geschätzt|abgeleitet)")]
    public async Task ThenDraftCurve(int peak, string spread, string source)
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        Assert.Equal(new FieldDto<int>(peak, Source(source)), d.DrinkPeak);
        Assert.Equal(new FieldDto<double>(Number(spread), Source(source)), d.DrinkSpread);
    }

    [Then(@"hat der Entwurf keinen Trinkzeitpunkt und keine Streuung")]
    public async Task ThenDraftNoCurve()
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        Assert.Null(d.DrinkPeak);
        Assert.Null(d.DrinkSpread);
    }

    [When(@"ich den Entwurf mit seinen Trinkwerten als Wein ""([^""]*)"" speichere")]
    public async Task WhenAcceptWithCurve(string name)
    {
        var d = await world.Captures.GetAsync(world.LastDraft!.Id);
        var wine = await world.Wines.CreateAsync(new SaveWineRequest(
            null, name, Quantity: d.Summary.BottleCount, DrinkPeak: d.DrinkPeak?.Value, DrinkSpread: d.DrinkSpread?.Value));
        await world.Captures.AcceptAsync(d.Summary.Id, new AcceptCaptureRequest(WineId: wine.Id));
    }

    // ----- Estimating an existing wine -----

    [When(@"ich bei ""([^""]*)"" ""Trinkzeitpunkt schätzen"" wähle")]
    public async Task WhenEstimate(string name)
    {
        var id = (await world.FindWineAsync(name)).Id;
        await world.TryAsync(async () => await world.DrinkingCurves.EstimateAsync(id));
    }

    [Then(@"der Agent hat die Daten von ""([^""]*)"" ohne Foto erhalten")]
    public void ThenAgentText(string name)
    {
        Assert.Equal(1, world.Agent.CurveCalls);
        Assert.Contains(name, world.Agent.LastHint);
    }
}
