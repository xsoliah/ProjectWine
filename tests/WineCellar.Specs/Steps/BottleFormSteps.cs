using Reqnroll;
using WineCellar.Application;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public sealed class BottleFormSteps(TestWorld world)
{
    private async Task SetFormAsync(string wineName, BottleForm? form)
    {
        var wine = await world.FindWineAsync(wineName);
        await world.Wines.UpdateAsync(wine.Id, new SaveWineRequest(
            wine.Barcode, wine.Name, wine.Producer, wine.Vintage, wine.Type, wine.Country?.Id, wine.Region?.Id,
            Grapes: null, wine.BottleSizeMl, wine.Quantity, wine.DrinkFrom, wine.DrinkUntil, wine.PurchasePrice, wine.Notes,
            BottleForm: form));
    }

    [Given(@"ich setze die Flaschenform von ""([^""]*)"" auf ""([^""]*)""")]
    [When(@"ich die Flaschenform von ""([^""]*)"" auf ""([^""]*)"" setze")]
    public async Task WhenSetForm(string wineName, string form) =>
        await world.TryAsync(() => SetFormAsync(wineName, Enum.Parse<BottleForm>(form)));

    [When(@"ich die Flaschenform von ""([^""]*)"" auf automatisch setze")]
    public async Task WhenAutomatic(string wineName) => await world.TryAsync(() => SetFormAsync(wineName, null));

    [When(@"ich die Flaschenform von ""([^""]*)"" auf einen ungültigen Wert setze")]
    public async Task WhenInvalid(string wineName) => await world.TryAsync(() => SetFormAsync(wineName, (BottleForm)99));

    [Then(@"hat ""([^""]*)"" die Flaschenform ""([^""]*)""")]
    public async Task ThenForm(string wineName, string form) =>
        Assert.Equal(Enum.Parse<BottleForm>(form), (await world.FindWineAsync(wineName)).BottleForm);

    [Then(@"hat ""([^""]*)"" keine gewählte Flaschenform")]
    public async Task ThenNoForm(string wineName) => Assert.Null((await world.FindWineAsync(wineName)).BottleForm);
}
