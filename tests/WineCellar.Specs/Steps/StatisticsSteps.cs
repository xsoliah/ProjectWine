using Reqnroll;
using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class StatisticsSteps(TestWorld world, OriginSteps origins, GrapeSteps grapes)
{
    private static readonly Dictionary<string, WineType> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Rotwein"] = WineType.Red,
        ["Weißwein"] = WineType.White,
        ["Rosé"] = WineType.Rose,
        ["Schaumwein"] = WineType.Sparkling,
        ["Dessertwein"] = WineType.Dessert,
        ["Likörwein"] = WineType.Fortified,
        ["Sonstige"] = WineType.Other
    };

    /// <summary>
    /// Seeds wines from a table. Columns: Wein, Flaschen, and optionally Typ, Land, Region, Winzer, Preis,
    /// Rebsorten (quoted names with optional shares, e.g. "Merlot" 60 %, "Cabernet Franc").
    /// Countries and regions are created on the fly.
    /// </summary>
    [Given(@"mein Keller enthält folgende Weine:")]
    public async Task GivenWines(DataTable table)
    {
        foreach (var row in table.Rows)
        {
            string? Cell(string column) =>
                row.TryGetValue(column, out var v) && !string.IsNullOrWhiteSpace(v) ? v.Trim() : null;

            var country = Cell("Land");
            var region = Cell("Region");
            Guid? countryId = country is null ? null : await origins.EnsureCountryAsync(country);
            Guid? regionId = region is null ? null : await origins.EnsureRegionAsync(country!, region);

            await world.Wines.CreateAsync(new SaveWineRequest(
                Barcode: null,
                Name: Cell("Wein")!,
                Producer: row.TryGetValue("Winzer", out var producer) && producer.Length > 0 ? producer : null,
                Type: Cell("Typ") is { } type ? Types[type] : WineType.Red,
                CountryId: countryId,
                RegionId: regionId,
                Quantity: int.Parse(Cell("Flaschen") ?? "1"),
                PurchasePrice: Cell("Preis") is { } price ? CommonSteps.ParseMoney(price) : null,
                Grapes: Cell("Rebsorten") is { } list ? await grapes.RequestAsync(list) : null));
        }
    }

    [Given(@"mein Keller enthält Weine von (\d+) verschiedenen Winzern")]
    public async Task GivenProducers(int count)
    {
        // Winzer 01 has the most bottles, then descending, so the expected order is deterministic.
        for (var i = 1; i <= count; i++)
            await world.Wines.CreateAsync(new SaveWineRequest(
                Barcode: null, Name: $"Wein {i:00}", Producer: $"Winzer {i:00}", Quantity: count + 1 - i));
    }

    [When(@"ich die Übersicht öffne")]
    [When(@"er die Übersicht öffnet")]
    public async Task WhenOpenOverview() =>
        world.LastStatistics = await world.Statistics.GetAsync(StatisticsGrouping.Type);

    [When(@"ich die Gruppierung ""([^""]*)"" wähle")]
    public async Task WhenGroupBy(string grouping) =>
        world.LastStatistics = await world.Statistics.GetAsync(ParseGrouping(grouping));

    [Given(@"mein Keller enthält Cuvées in (\d+) verschiedenen Zusammensetzungen")]
    public async Task GivenCompositions(int count)
    {
        // Composition i: "Basis" plus "Partner NN"; composition 01 has the most bottles.
        for (var i = 1; i <= count; i++)
            await world.Wines.CreateAsync(new SaveWineRequest(
                Barcode: null, Name: $"Cuvée {i:00}", Quantity: count + 1 - i,
                Grapes: await grapes.RequestAsync($"\"Basis\" und \"Partner {i:00}\"")));
    }

    [When(@"ich in der Gruppierung ""Rebsorte"" auf ""Cuvée"" tippe")]
    [When(@"ich auf ""Cuvée"" tippe")]
    public async Task WhenCuveeDrillDown() =>
        world.LastStatistics = await world.Statistics.GetAsync(StatisticsGrouping.Grape, cuvee: true);

    [When(@"ich in der Gruppierung ""Land"" auf ""([^""]*)"" tippe")]
    public async Task WhenDrillDown(string country)
    {
        var id = (await world.Origins.ListAsync()).Single(c => c.Name == country).Id;
        world.LastStatistics = await world.Statistics.GetAsync(StatisticsGrouping.Region, id);
    }

    [Then(@"sehe ich (\d+) Flaschen, (\d+) Weine und einen Gesamtwert von ([\d.,]+) €")]
    public void ThenTotals(int bottles, int wines, string value)
    {
        var totals = Stats.Totals;
        Assert.Equal(bottles, totals.Bottles);
        Assert.Equal(wines, totals.Wines);
        Assert.Equal(CommonSteps.ParseMoney(value.Replace(".", "")), totals.TotalValue);
    }

    [Then(@"einen Hinweis, dass (\d+) Weine? keinen Einkaufspreis hat")]
    [Then(@"einen Hinweis, dass (\d+) Weine? keinen Einkaufspreis haben")]
    public void ThenWithoutPrice(int count) => Assert.Equal(count, Stats.Totals.WinesWithoutPrice);

    [Then(@"sieht er (\d+) Flaschen")]
    [Then(@"sehe ich (\d+) Flaschen")]
    public void ThenBottles(int bottles) => Assert.Equal(bottles, Stats.Totals.Bottles);

    /// <summary>Compares the segments in order. Columns: Segment, Flaschen and optionally Prozent.</summary>
    [Then(@"zeigt das Diagramm:")]
    public void ThenChart(DataTable table)
    {
        var expected = table.Rows.Select(r => (
            Label: r["Segment"],
            Bottles: int.Parse(r["Flaschen"]),
            Percent: r.TryGetValue("Prozent", out var p) ? int.Parse(p.TrimEnd('%', ' ')) : (int?)null)).ToList();
        var actual = Stats.Segments;

        Assert.Equal(expected.Select(e => e.Label), actual.Select(Label));
        Assert.Equal(expected.Select(e => e.Bottles), actual.Select(s => s.Bottles));
        if (expected.All(e => e.Percent is not null))
            Assert.Equal(expected.Select(e => e.Percent!.Value), actual.Select(s => s.Percent));
    }

    [Then(@"fasst ""Sonstige"" (\d+) Winzer mit zusammen ([\d]+) Flaschen zusammen")]
    public void ThenOther(int count, int bottles)
    {
        var other = Stats.Segments.Single(s => s.Key == StatisticsService.OtherKey);
        Assert.Equal(count, other.Children!.Count);
        Assert.Equal(bottles, other.Bottles);
    }

    [Then(@"lautet die Überschrift ""([^""]*)""")]
    public void ThenHeading(string heading) =>
        Assert.Equal(heading, Stats.DrillDown == StatisticsService.CuveeKey ? "Cuvées" : Stats.Country?.Name);

    [Then(@"zeigt die Übersicht keine Verteilung")]
    public void ThenEmpty()
    {
        Assert.Equal(0, Stats.Totals.Bottles);
        Assert.Empty(Stats.Segments);
    }

    private StatisticsDto Stats => world.LastStatistics ?? throw new InvalidOperationException("Übersicht nicht geöffnet.");

    /// <summary>The UI shows wine types in German; the API returns the enum name.</summary>
    private string Label(StatisticsSegmentDto segment) =>
        Stats.GroupBy == StatisticsGrouping.Type && Enum.TryParse<WineType>(segment.Key, out var type)
            ? Types.First(t => t.Value == type).Key
            : segment.Label;

    private static StatisticsGrouping ParseGrouping(string text) => text switch
    {
        "Weintyp" => StatisticsGrouping.Type,
        "Land" => StatisticsGrouping.Country,
        "Region" => StatisticsGrouping.Region,
        "Winzer" => StatisticsGrouping.Producer,
        "Rebsorte" => StatisticsGrouping.Grape,
        _ => throw new ArgumentException($"Unbekannte Gruppierung '{text}'")
    };
}
