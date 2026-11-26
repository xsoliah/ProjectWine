using System.Text.RegularExpressions;
using Reqnroll;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public partial class GrapeSteps(TestWorld world)
{
    private IReadOnlyList<WineDto>? _searchResult;

    /// <summary>Matches "Name" or "Name" 85 % in a step text.</summary>
    [GeneratedRegex(@"""([^""]+)""(?:\s+(\d+)\s*%)?")]
    private static partial Regex QuotedGrape();

    // ----- Given -----

    [Given(@"^ich habe die Rebsorten? (.+)$")]
    public async Task GivenGrapes(string list)
    {
        foreach (var (name, _) in Parse(list)) await EnsureGrapeAsync(name);
    }

    [Given(@"^der Wein ""([^""]*)"" hat (?:die Rebsorten? )?(.+)$")]
    public async Task GivenWineWithGrapes(string wine, string list) =>
        await world.Wines.CreateAsync(new SaveWineRequest(Barcode: null, Name: wine, Grapes: await RequestAsync(list)));

    [Given(@"die externe Datenbank kennt den Barcode ""([^""]*)"" als ""([^""]*)"" mit den Rebsorten ""([^""]*)""")]
    public void GivenExternalWithGrapes(string barcode, string name, string grapes) =>
        world.ExternalBarcodes.Add(barcode, new WineDraft(Name: name, Grapes: grapes));

    // ----- When -----

    [When(@"ich die Rebsorte ""([^""]*)"" anlege")]
    public async Task WhenCreate(string name) =>
        await world.TryAsync(async () => Remember(await world.Grapes.CreateAsync(new SaveOriginRequest(name))));

    [When(@"^ich einen Wein ""([^""]*)"" (?:nur )?mit (?:den Rebsorten|der Rebsorte) ("".+) speichere$")]
    public async Task WhenSaveWithGrapes(string wine, string list) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(
            new SaveWineRequest(Barcode: null, Name: wine, Grapes: await RequestAsync(list))));

    [When(@"ich einen Wein ""([^""]*)"" ohne Rebsorte speichere")]
    public async Task WhenSaveWithout(string wine) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(new SaveWineRequest(Barcode: null, Name: wine)));

    [When(@"ich einem Wein ""([^""]*)"" die Rebsorte ""([^""]*)"" zuweise")]
    public async Task WhenAssign(string wine, string grape) => await WhenSaveWithGrapes(wine, $"\"{grape}\"");

    [When(@"ich bei ""([^""]*)"" die Rebsorte ""([^""]*)"" entferne")]
    public async Task WhenRemove(string wineName, string grape) =>
        await world.TryAsync(async () =>
        {
            var wine = await world.FindWineAsync(wineName);
            var remaining = wine.Grapes.Where(g => g.Name != grape).Select(g => new WineGrapeRequest(g.Id, g.Percent)).ToList();
            await world.Wines.UpdateAsync(wine.Id, ToSaveRequest(wine) with { Grapes = remaining });
        });

    [When(@"ich die Rebsorte ""([^""]*)"" in ""([^""]*)"" umbenenne")]
    public async Task WhenRename(string from, string to) =>
        await world.TryAsync(async () => await world.Grapes.RenameAsync(await IdAsync(from), new SaveOriginRequest(to)));

    [When(@"ich die Rebsorte ""([^""]*)"" in ""([^""]*)"" zusammenführe")]
    public async Task WhenMerge(string source, string target) =>
        await world.TryAsync(async () => await world.Grapes.MergeAsync(await IdAsync(source), await IdAsync(target)));

    [When(@"ich die Rebsorte ""([^""]*)"" lösche")]
    public async Task WhenDelete(string name) =>
        await world.TryAsync(async () => await world.Grapes.DeleteAsync(await IdAsync(name)));

    [When(@"ich im Keller nach ""([^""]*)"" suche")]
    public async Task WhenSearch(string term) =>
        _searchResult = await world.Wines.ListAsync(new WineQuery(Search: term, InCellarOnly: false));

    // ----- Then -----

    [Then(@"erscheint ""([^""]*)"" in meiner Rebsortenliste")]
    public async Task ThenListed(string name) =>
        Assert.Contains(await world.Grapes.ListAsync(), g => g.Name == name);

    [Then(@"zeigt meine Rebsortenliste ""([^""]*)""")]
    public async Task ThenList(string expected) =>
        Assert.Equal(expected, string.Join(", ", (await world.Grapes.ListAsync()).Select(g => $"{g.Name} ({g.WineCount})")));

    [Then(@"^(?:enthält meine Rebsortenliste nicht|gibt es keine Rebsorte) ""([^""]*)""$")]
    public async Task ThenNotListed(string name) =>
        Assert.DoesNotContain(await world.Grapes.ListAsync(), g => g.Name == name);

    [Then(@"zeigt der Wein ""([^""]*)"" die Rebsorten ""([^""]*)""")]
    [Then(@"hat der Wein ""([^""]*)"" die Rebsorten ""([^""]*)""")]
    public async Task ThenWineGrapes(string wine, string expected)
    {
        var dto = await world.FindWineAsync(wine);
        Assert.Equal(expected, string.Join(", ", dto.Grapes.Select(g => g.Percent is { } p ? $"{g.Name} {p} %" : g.Name)));
    }

    [Then(@"hat der Wein ""([^""]*)"" keine Rebsorten")]
    public async Task ThenNoGrapes(string wine) => Assert.Empty((await world.FindWineAsync(wine)).Grapes);

    [Then(@"ist (?:der Wein )?""([^""]*)"" rebsortenrein")]
    public async Task ThenSingle(string wine)
    {
        var dto = await world.FindWineAsync(wine);
        Assert.Single(dto.Grapes);
        Assert.False(dto.IsCuvee);
    }

    [Then(@"ist (?:der Wein )?""([^""]*)"" eine Cuvée")]
    public async Task ThenCuvee(string wine) => Assert.True((await world.FindWineAsync(wine)).IsCuvee);

    [Then(@"ist der Wein ""([^""]*)"" weder rebsortenrein noch Cuvée")]
    public async Task ThenNeither(string wine)
    {
        var dto = await world.FindWineAsync(wine);
        Assert.Empty(dto.Grapes);
        Assert.False(dto.IsCuvee);
    }

    [Then(@"finde ich ""([^""]*)"", aber nicht ""([^""]*)""")]
    public void ThenFound(string found, string notFound)
    {
        Assert.NotNull(_searchResult);
        Assert.Contains(_searchResult!, w => w.Name == found);
        Assert.DoesNotContain(_searchResult!, w => w.Name == notFound);
    }

    [Then(@"ist im Vorschlag die Rebsorte ""([^""]*)"" zugeordnet")]
    public async Task ThenDraftGrapeMatched(string name)
    {
        var draft = Assert.Single(world.LastLookup!.DraftGrapes!, g => g.Name == name);
        Assert.Equal(await IdAsync(name), draft.GrapeId);
    }

    [Then(@"wird ""([^""]*)"" als neue Rebsorte vorgeschlagen")]
    public async Task ThenDraftGrapeNew(string name)
    {
        var draft = Assert.Single(world.LastLookup!.DraftGrapes!, g => g.Name == name);
        Assert.Null(draft.GrapeId);
        await ThenNotListed(name); // nothing is created without confirmation
    }

    [Then(@"zerlegt die Trennregel ""([^""]*)"" in ""([^""]*)""")]
    public void ThenSplit(string text, string expected) =>
        Assert.Equal(expected, string.Join(" | ", GrapeText.Split(text)));

    // ----- Helpers -----

    public async Task<Guid> EnsureGrapeAsync(string name)
    {
        var own = (await world.Grapes.ListAsync()).FirstOrDefault(g => g.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
        if (own is not null) return own.Id;
        var created = await world.Grapes.CreateAsync(new SaveOriginRequest(name));
        Remember(created);
        return created.Id;
    }

    /// <summary>"A" 85 % und "B" 15 % → grape requests; unknown own names are created, other users' names reused.</summary>
    public async Task<IReadOnlyList<WineGrapeRequest>> RequestAsync(string list)
    {
        var result = new List<WineGrapeRequest>();
        foreach (var (name, percent) in Parse(list))
        {
            var own = (await world.Grapes.ListAsync()).FirstOrDefault(g => g.Name == name);
            var id = own?.Id ?? (world.KnownGrapes.TryGetValue(name, out var foreign) ? foreign : await EnsureGrapeAsync(name));
            result.Add(new WineGrapeRequest(id, percent));
        }
        return result;
    }

    private static IEnumerable<(string Name, int? Percent)> Parse(string list) =>
        QuotedGrape().Matches(list).Select(m => (m.Groups[1].Value, m.Groups[2].Success ? int.Parse(m.Groups[2].Value) : (int?)null));

    private async Task<Guid> IdAsync(string name) =>
        (await world.Grapes.ListAsync()).FirstOrDefault(g => g.Name == name)?.Id ?? world.KnownGrapes[name];

    private void Remember(GrapeVarietyDto grape) => world.KnownGrapes[grape.Name] = grape.Id;

    internal static SaveWineRequest ToSaveRequest(WineDto w) => new(
        w.Barcode, w.Name, w.Producer, w.Vintage, w.Type, w.Country?.Id, w.Region?.Id,
        w.Grapes.Select(g => new WineGrapeRequest(g.Id, g.Percent)).ToList(),
        w.BottleSizeMl, w.Quantity, w.DrinkFrom, w.DrinkUntil, w.PurchasePrice, w.Notes);
}
