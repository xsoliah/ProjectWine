using Reqnroll;
using WineCellar.Application;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class ArchiveSteps(TestWorld world)
{
    [When(@"ich (\d+) Flaschen? ""([^""]*)"" trinke")]
    public async Task WhenDrink(int quantity, string name) =>
        await Consume(name, new ConsumeRequest(ConsumptionKind.Drunk, quantity));

    [When(@"ich (\d+) Flaschen? ""([^""]*)"" trinke und mit ([\d,]+) Sternen bewerte und anmerke ""([^""]*)""")]
    public async Task WhenDrinkAndRate(int quantity, string name, string stars, string note) =>
        await Consume(name, new ConsumeRequest(
            ConsumptionKind.Drunk, quantity, Rating: CommonSteps.ParseStars(stars), TastingNote: note));

    [When(@"ich (\d+) Flaschen? ""([^""]*)"" für ([\d,]+) € an ""([^""]*)"" verkaufe")]
    public async Task WhenSell(int quantity, string name, string price, string buyer) =>
        await Consume(name, new ConsumeRequest(
            ConsumptionKind.Sold, quantity, Price: CommonSteps.ParseMoney(price), Counterparty: buyer));

    [When(@"ich (\d+) Flaschen? ""([^""]*)"" an ""([^""]*)"" verschenke")]
    public async Task WhenGift(int quantity, string name, string recipient) =>
        await Consume(name, new ConsumeRequest(ConsumptionKind.Gifted, quantity, Counterparty: recipient));

    [When(@"ich den Archiveintrag für ""([^""]*)"" nachträglich mit ([\d,]+) Sternen bewerte")]
    public async Task WhenRateLater(string name, string stars) =>
        await world.TryAsync(async () =>
        {
            var entry = await world.FindArchiveEntryAsync(name);
            await world.Archive.UpdateAsync(entry.Id, new UpdateArchiveEntryRequest(
                Rating: CommonSteps.ParseStars(stars),
                TastingNote: entry.TastingNote,
                Counterparty: entry.Counterparty,
                Price: entry.Price));
        });

    [When(@"ich den Archiveintrag für ""([^""]*)"" rückgängig mache")]
    public async Task WhenUndo(string name) =>
        await world.TryAsync(async () =>
        {
            var entry = await world.FindArchiveEntryAsync(name);
            await world.Archive.DeleteAsync(entry.Id);
        });

    [Then(@"das Archiv enthält einen Eintrag ""([^""]*)"" für ""([^""]*)""")]
    public async Task ThenArchiveContainsEntry(string kind, string name)
    {
        var entry = await world.FindArchiveEntryAsync(name);
        Assert.Equal(CommonSteps.ParseKind(kind), entry.Kind);
    }

    [Then(@"das Archiv enthält (\d+) (?:Eintrag|Einträge)")]
    public async Task ThenArchiveCount(int count) =>
        Assert.Equal(count, (await world.Archive.ListAsync()).Count);

    [Then(@"zeigt das Archiv gefiltert nach ""([^""]*)"" genau (\d+) (?:Eintrag|Einträge)")]
    public async Task ThenArchiveFilteredCount(string kind, int count) =>
        Assert.Equal(count, (await world.Archive.ListAsync(CommonSteps.ParseKind(kind))).Count);

    [Then(@"hat der Archiveintrag für ""([^""]*)"" die Bewertung ([\d,]+)")]
    public async Task ThenHasRating(string name, string stars)
    {
        var entry = await world.FindArchiveEntryAsync(name);
        Assert.Equal(CommonSteps.ParseStars(stars), entry.Rating);
    }

    [Then(@"die Notiz des Archiveintrags für ""([^""]*)"" lautet ""([^""]*)""")]
    public async Task ThenHasNote(string name, string note)
    {
        var entry = await world.FindArchiveEntryAsync(name);
        Assert.Equal(note, entry.TastingNote);
    }

    private async Task Consume(string wineName, ConsumeRequest request) =>
        await world.TryAsync(async () =>
        {
            var wine = await world.FindWineAsync(wineName);
            world.LastArchiveEntry = await world.Wines.ConsumeAsync(wine.Id, request);
        });
}
