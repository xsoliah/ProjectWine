using Reqnroll;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class OriginSteps(TestWorld world)
{
    // ----- Given -----

    [Given(@"ich habe das Land ""([^""]*)""")]
    public async Task GivenCountry(string country) => await EnsureCountryAsync(country);

    [Given(@"^""([^""]*)"" hat die Region(?:en)? (.+)$")]
    public async Task GivenRegions(string country, string regions)
    {
        foreach (var region in SplitList(regions))
            await EnsureRegionAsync(country, region);
    }

    [Given(@"die externe Datenbank kennt den Barcode ""([^""]*)"" als ""([^""]*)"" aus ""([^""]*)""")]
    public void GivenExternalWithCountry(string barcode, string name, string country) =>
        world.ExternalBarcodes.Add(barcode, new WineDraft(Name: name, Country: country));

    // ----- When -----

    [When(@"ich das Land ""([^""]*)"" anlege")]
    public async Task WhenCreateCountry(string name) =>
        await world.TryAsync(async () => Remember(world.KnownCountries, await world.Origins.CreateCountryAsync(new SaveOriginRequest(name))));

    [When(@"ich unter ""([^""]*)"" die Region ""([^""]*)"" anlege")]
    public async Task WhenCreateRegion(string country, string name) =>
        await world.TryAsync(async () =>
        {
            var countryId = await CountryIdAsync(country);
            Remember(world.KnownRegions, await world.Origins.CreateRegionAsync(countryId, new SaveOriginRequest(name)));
        });

    [When(@"ich einen Wein ""([^""]*)"" mit dem Land ""([^""]*)"" und der Region ""([^""]*)"" speichere")]
    public async Task WhenSaveWithCountryAndRegion(string wine, string country, string region) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(new SaveWineRequest(
            Barcode: null, Name: wine, CountryId: await CountryIdAsync(country), RegionId: await RegionIdAsync(region))));

    [When(@"ich einen Wein ""([^""]*)"" nur mit dem Land ""([^""]*)"" speichere")]
    [When(@"ich einem Wein ""([^""]*)"" das Land ""([^""]*)"" zuweise")]
    public async Task WhenSaveWithCountry(string wine, string country) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(new SaveWineRequest(
            Barcode: null, Name: wine, CountryId: await CountryIdAsync(country))));

    [When(@"ich einen Wein ""([^""]*)"" mit der Region ""([^""]*)"", aber ohne Land speichere")]
    public async Task WhenSaveWithRegionOnly(string wine, string region) =>
        await world.TryAsync(async () => await world.Wines.CreateAsync(new SaveWineRequest(
            Barcode: null, Name: wine, RegionId: await RegionIdAsync(region))));

    [When(@"ich das Land ""([^""]*)"" in ""([^""]*)"" umbenenne")]
    public async Task WhenRenameCountry(string from, string to) =>
        await world.TryAsync(async () => await world.Origins.RenameCountryAsync(await CountryIdAsync(from), new SaveOriginRequest(to)));

    [When(@"ich die Region ""([^""]*)"" in ""([^""]*)"" umbenenne")]
    public async Task WhenRenameRegion(string from, string to) =>
        await world.TryAsync(async () => await world.Origins.RenameRegionAsync(await RegionIdAsync(from), new SaveOriginRequest(to)));

    [When(@"ich das Land ""([^""]*)"" in ""([^""]*)"" zusammenführe")]
    public async Task WhenMergeCountry(string source, string target) =>
        await world.TryAsync(async () =>
            await world.Origins.MergeCountryAsync(await CountryIdAsync(source), await CountryIdAsync(target)));

    [When(@"ich die Region ""([^""]*)"" in ""([^""]*)"" zusammenführe")]
    public async Task WhenMergeRegion(string source, string target) =>
        await world.TryAsync(async () =>
            await world.Origins.MergeRegionAsync(await RegionIdAsync(source), await RegionIdAsync(target)));

    [When(@"ich das Land ""([^""]*)"" lösche")]
    public async Task WhenDeleteCountry(string name) =>
        await world.TryAsync(async () => await world.Origins.DeleteCountryAsync(await CountryIdAsync(name)));

    [When(@"ich die Region ""([^""]*)"" lösche")]
    public async Task WhenDeleteRegion(string name) =>
        await world.TryAsync(async () => await world.Origins.DeleteRegionAsync(await RegionIdAsync(name)));

    // ----- Then -----

    [Then(@"wird die Aktion abgelehnt")]
    public void ThenRejected() => Assert.NotNull(world.LastError);

    [Then(@"^wird die Aktion als Konflikt abgelehnt$")]
    public void ThenConflict() => Assert.IsType<ConflictException>(world.LastError);

    [Then(@"^wird die Aktion als Konflikt abgelehnt mit ""([^""]*)""$")]
    public void ThenConflictWith(string fragment)
    {
        ThenConflict();
        Assert.Contains(fragment, world.LastError!.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Then(@"zeigt meine Herkunftsliste ""([^""]*)""")]
    public async Task ThenOriginList(string expected) =>
        Assert.Equal(expected, Format(await world.Origins.ListAsync()));

    [Then(@"enthält meine Länderliste nicht ""([^""]*)""")]
    public async Task ThenListDoesNotContain(string country) =>
        Assert.DoesNotContain(await world.Origins.ListAsync(), c => c.Name == country);

    [Then(@"gibt es kein Land ""([^""]*)""")]
    public async Task ThenNoCountry(string country) => await ThenListDoesNotContain(country);

    [Then(@"gibt es keine Region ""([^""]*)""")]
    public async Task ThenNoRegion(string region) =>
        Assert.DoesNotContain(await world.Origins.ListAsync(), c => c.Regions.Any(r => r.Name == region));

    [Then(@"zeigt der Wein ""([^""]*)"" die Herkunft ""([^""]*)""")]
    [Then(@"hat der Wein ""([^""]*)"" die Herkunft ""([^""]*)""")]
    public async Task ThenWineOrigin(string wine, string expected)
    {
        var dto = await world.FindWineAsync(wine);
        var origin = string.Join(", ", new[] { dto.Region?.Name, dto.Country?.Name }.Where(x => x is not null));
        Assert.Equal(expected, origin);
    }

    [Then(@"ist im Vorschlag das Land ""([^""]*)"" ausgewählt")]
    public async Task ThenDraftCountrySelected(string country)
    {
        Assert.NotNull(world.LastLookup);
        Assert.Equal(await CountryIdAsync(country), world.LastLookup!.DraftCountryId);
    }

    [Then(@"schlägt der Vorschlag das neue Land ""([^""]*)"" vor")]
    public async Task ThenDraftSuggestsNewCountry(string country)
    {
        Assert.NotNull(world.LastLookup?.Draft);
        Assert.Null(world.LastLookup!.DraftCountryId);
        Assert.Equal(country, world.LastLookup.Draft!.Country);
        await ThenNoCountry(country); // nothing is created without confirmation
    }

    // ----- Helpers (also used by the statistics steps) -----

    public async Task<Guid> EnsureCountryAsync(string name)
    {
        var own = (await world.Origins.ListAsync()).FirstOrDefault(c => c.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
        if (own is not null) return own.Id;
        var created = await world.Origins.CreateCountryAsync(new SaveOriginRequest(name));
        Remember(world.KnownCountries, created);
        return created.Id;
    }

    public async Task<Guid> EnsureRegionAsync(string country, string region)
    {
        var countryId = await EnsureCountryAsync(country);
        var own = (await world.Origins.ListAsync()).Single(c => c.Id == countryId).Regions
            .FirstOrDefault(r => r.Name.Equals(region, StringComparison.OrdinalIgnoreCase));
        if (own is not null) return own.Id;
        var created = await world.Origins.CreateRegionAsync(countryId, new SaveOriginRequest(region));
        Remember(world.KnownRegions, created);
        return created.Id;
    }

    /// <summary>Own country by name; falls back to one created by another user (to test isolation).</summary>
    private async Task<Guid> CountryIdAsync(string name)
    {
        var own = (await world.Origins.ListAsync()).FirstOrDefault(c => c.Name == name);
        return own?.Id ?? world.KnownCountries[name];
    }

    private async Task<Guid> RegionIdAsync(string name)
    {
        var own = (await world.Origins.ListAsync()).SelectMany(c => c.Regions).FirstOrDefault(r => r.Name == name);
        return own?.Id ?? world.KnownRegions[name];
    }

    private static void Remember(Dictionary<string, Guid> known, OriginRefDto origin) => known[origin.Name] = origin.Id;

    private static IEnumerable<string> SplitList(string text) =>
        text.Split([",", " und "], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.Trim('"'));

    private static string Format(IEnumerable<CountryDto> countries) =>
        string.Join("; ", countries.Select(c =>
            c.Regions.Count == 0 ? c.Name : $"{c.Name} ({string.Join(", ", c.Regions.Select(r => r.Name))})"));
}
