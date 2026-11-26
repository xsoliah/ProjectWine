using Reqnroll;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class WineSteps(TestWorld world)
{
    [Given(@"die externe Datenbank kennt den Barcode ""([^""]*)"" als ""([^""]*)"" von ""([^""]*)""")]
    public void GivenExternalDatabaseKnows(string barcode, string name, string producer) =>
        world.ExternalBarcodes.Add(barcode, new WineDraft(Name: name, Producer: producer));

    [Given(@"mein Keller enthält (\d+) Flaschen? ""([^""]*)"" mit dem Barcode ""([^""]*)""")]
    public async Task GivenCellarContainsWithBarcode(int quantity, string name, string barcode) =>
        await world.SeedWineAsync(name, quantity, barcode);

    [Given(@"mein Keller enthält (\d+) Flaschen? ""([^""]*)""")]
    public async Task GivenCellarContains(int quantity, string name) =>
        await world.SeedWineAsync(name, quantity);

    [When(@"ich den Barcode ""([^""]*)"" nachschlage")]
    public async Task WhenLookup(string barcode) =>
        await world.TryAsync(async () => world.LastLookup = await world.Wines.LookupBarcodeAsync(barcode));

    [When(@"ich (\d+) Flaschen? zum Wein ""([^""]*)"" hinzufüge")]
    public async Task WhenAddBottles(int count, string name) =>
        await world.TryAsync(async () =>
        {
            var wine = await world.FindWineAsync(name);
            await world.Wines.AddBottlesAsync(wine.Id, count);
        });

    [When(@"ich den Wein ""([^""]*)"" mit dem Barcode ""([^""]*)"" und (\d+) Flaschen? anlege")]
    public async Task WhenCreate(string name, string barcode, int quantity) =>
        await world.TryAsync(async () =>
            await world.Wines.CreateAsync(new SaveWineRequest(Barcode: barcode, Name: name, Quantity: quantity)));

    [Then(@"erhalte ich einen Vorschlag mit dem Namen ""([^""]*)""")]
    public void ThenDraftHasName(string name)
    {
        Assert.NotNull(world.LastLookup?.Draft);
        Assert.Equal(name, world.LastLookup!.Draft!.Name);
    }

    [Then(@"der Vorschlag stammt aus der externen Datenbank")]
    public void ThenDraftIsExternal() => Assert.Equal(LookupSource.External, world.LastLookup?.Source);

    [Then(@"wurde nichts gefunden")]
    public void ThenNothingFound() => Assert.Equal(LookupSource.None, world.LastLookup?.Source);

    [Then(@"wird der vorhandene Wein ""([^""]*)"" gefunden")]
    public void ThenExistingWineFound(string name)
    {
        Assert.Equal(LookupSource.Cellar, world.LastLookup?.Source);
        Assert.Equal(name, world.LastLookup!.ExistingWine!.Name);
    }

    [Then(@"enthält mein Keller (\d+) Flaschen? ""([^""]*)""")]
    public async Task ThenCellarContains(int quantity, string name)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Equal(quantity, wine.Quantity);
    }

    [Then(@"zeigt die Kelleransicht keine Weine")]
    public async Task ThenCellarEmpty()
    {
        var wines = await world.Wines.ListAsync(new WineQuery());
        Assert.Empty(wines);
    }
}
