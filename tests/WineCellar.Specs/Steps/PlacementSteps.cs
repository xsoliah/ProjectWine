using Reqnroll;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class PlacementSteps(TestWorld world)
{
    private PlacementSuggestionDto? _suggestion;

    // ----- When -----

    [When(@"ich einen Einlagerungsvorschlag für ""([^""]*)"" anfordere")]
    public async Task WhenSuggest(string wine) => await Suggest(wine, null);

    [When(@"ich einen Einlagerungsvorschlag für ""([^""]*)"" mit (\d+) Flaschen? anfordere")]
    public async Task WhenSuggestCount(string wine, int count) => await Suggest(wine, count);

    [When(@"ich den Vorschlag übernehme")]
    public async Task WhenAccept() =>
        await world.TryAsync(async () => await world.Racks.PlaceManyAsync(new PlaceBottlesRequest(
            _suggestion!.WineId, _suggestion.Slots.Select(s => new PlaceBottleTarget(s.RackId, s.Row, s.Column)).ToList())));

    /// <summary>Someone else (a second device) takes a slot after the suggestion was made.</summary>
    [When(@"in der Zwischenzeit wird ""([^""]*)"" Reihe (\d+), Spalte (\d+) mit ""([^""]*)"" belegt")]
    public async Task WhenTakenMeanwhile(string rack, int row, int column, string wine) =>
        await world.Racks.PlaceAsync(world.KnownRacks[rack],
            new PlaceBottleRequest((await world.FindWineAsync(wine)).Id, row, column));

    [When(@"ich versuche, (\d+) Flaschen ""([^""]*)"" in ""([^""]*)"" Reihe (\d+) ab Spalte (\d+) einzulagern")]
    public async Task WhenPlaceMany(int count, string wine, string rack, int row, int firstColumn) =>
        await world.TryAsync(async () => await world.Racks.PlaceManyAsync(new PlaceBottlesRequest(
            (await world.FindWineAsync(wine)).Id,
            Enumerable.Range(firstColumn, count).Select(c => new PlaceBottleTarget(world.KnownRacks[rack], row, c)).ToList())));

    // ----- Then -----

    [Then(@"lautet der Vorschlag ""([^""]*)""")]
    public void ThenSuggestion(string expected)
    {
        Assert.Null(world.LastError);
        Assert.Equal(expected, string.Join("; ", _suggestion!.Slots.Select(s => $"{s.RackName} – Reihe {s.Row}, Spalte {s.Column}")));
    }

    [Then(@"nennt die Begründung ""([^""]*)""")]
    public void ThenReason(string fragment) =>
        Assert.Contains(fragment, _suggestion!.Reason, StringComparison.OrdinalIgnoreCase);

    [Then(@"können (\d+) Flaschen? nicht untergebracht werden")]
    public void ThenUnplaceable(int count) => Assert.Equal(count, _suggestion!.Unplaceable);

    // ----- Helpers -----

    private async Task Suggest(string wine, int? count) =>
        await world.TryAsync(async () =>
        {
            var id = world.KnownWines.TryGetValue(wine, out var known) ? known : (await world.FindWineAsync(wine)).Id;
            _suggestion = await world.Suggestions.SuggestAsync(id, count);
        });
}
