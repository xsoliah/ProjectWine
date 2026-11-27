using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;

namespace WineCellar.Specs.Unit;

public class PlacementPlannerTests
{
    private static readonly Guid Italy = Guid.NewGuid();
    private static readonly Guid Germany = Guid.NewGuid();
    private static readonly Guid Toscana = Guid.NewGuid();
    private static readonly Guid Piemont = Guid.NewGuid();
    private static readonly Guid Mosel = Guid.NewGuid();

    private static PlacementWine Wine(string name, string? producer = null, Guid? region = null, string? regionName = null,
        Guid? country = null, WineType type = WineType.Red, int? vintage = null, int? from = null, int? until = null) =>
        new(Guid.NewGuid(), name, producer, region, regionName, country, country == Italy ? "Italien" : country == Germany ? "Deutschland" : null,
            type, vintage, from, until);

    private static PlacementWine Tuscan(string name, string? producer = null, int? vintage = null) =>
        Wine(name, producer, Toscana, "Toskana", Italy, vintage: vintage);

    private static PlacementRack Rack(string name, int height, int width, params (int Row, int Column, PlacementWine Wine)[] bottles) =>
        new(Guid.NewGuid(), name, height, width, bottles.ToDictionary(b => (b.Row, b.Column), b => b.Wine));

    private static string Slots(PlacementSuggestionDto dto) =>
        string.Join("; ", dto.Slots.Select(s => $"{s.RackName} R{s.Row}C{s.Column}"));

    // ----- Similarity -----

    [Fact]
    public void Similarity_follows_the_ranking_same_wine_producer_region_country_type()
    {
        var a = Wine("A", "Antinori", Toscana, "Toskana", Italy, WineType.Red);
        var sameWine = PlacementPlanner.Similarity(a, a).Points;
        var producer = PlacementPlanner.Similarity(a, Wine("B", "antinori ", Piemont, "Piemont", Italy, WineType.White)).Points;
        var region = PlacementPlanner.Similarity(a, Wine("C", "Andere", Toscana, "Toskana", Italy, WineType.White)).Points;
        var country = PlacementPlanner.Similarity(a, Wine("D", "Andere", Piemont, "Piemont", Italy, WineType.White)).Points;
        var type = PlacementPlanner.Similarity(a, Wine("E", "Andere", Mosel, "Mosel", Germany, WineType.Red)).Points;

        Assert.True(sameWine > producer && producer > region && region > country && country > type && type > 0,
            $"{sameWine} > {producer} > {region} > {country} > {type}");
    }

    [Fact]
    public void Missing_traits_give_no_points_and_no_penalty()
    {
        var a = Wine("A", producer: null, type: WineType.White);
        var b = Wine("B", producer: null, type: WineType.Red);
        Assert.Equal(0, PlacementPlanner.Similarity(a, b).Points);
    }

    [Fact]
    public void Similar_vintage_and_drink_window_add_points()
    {
        var a = Wine("A", vintage: 2019, from: 2025, until: 2030, type: WineType.Red);
        var close = Wine("B", vintage: 2020, from: 2027, until: 2032, type: WineType.White);
        var far = Wine("C", vintage: 2005, from: 2008, until: 2012, type: WineType.White);

        Assert.Equal(PlacementPlanner.PointsVintage + PlacementPlanner.PointsDrinkWindow, PlacementPlanner.Similarity(a, close).Points);
        Assert.Equal(0, PlacementPlanner.Similarity(a, far).Points);
    }

    // ----- Single bottle -----

    [Fact]
    public void Same_region_lies_together()
    {
        var rack = Rack("Keller links", 5, 6,
            (2, 1, Tuscan("Brunello")), (2, 2, Tuscan("Chianti")),
            (4, 1, Wine("Riesling", "Weingut", Mosel, "Mosel", Germany, WineType.White)));

        var result = PlacementPlanner.Plan(Tuscan("Vino Nobile"), [rack], 1);

        Assert.Equal("Keller links R2C3", Slots(result));
        Assert.Contains("Toskana", result.Reason);
    }

    [Fact]
    public void Producer_beats_region()
    {
        var producerWine = Wine("Eigener", "Antinori", Piemont, "Piemont", Italy);
        var regionWine = Wine("Anderer", "Banfi", Toscana, "Toskana", Italy);
        var rack = Rack("R", 6, 6, (1, 1, producerWine), (4, 1, regionWine));

        var result = PlacementPlanner.Plan(Wine("Neu", "Antinori", Toscana, "Toskana", Italy), [rack], 1);

        Assert.Equal(1, result.Slots[0].Row);
        Assert.Contains("Antinori", result.Reason);
    }

    [Fact]
    public void Similar_vintage_wins_between_equal_neighbours()
    {
        var old = Wine("Alt", "Antinori", Toscana, "Toskana", Italy, vintage: 2005);
        var young = Wine("Jung", "Antinori", Toscana, "Toskana", Italy, vintage: 2020);
        var rack = Rack("R", 8, 2, (1, 1, old), (5, 1, young));

        var result = PlacementPlanner.Plan(Wine("Neu", "Antinori", Toscana, "Toskana", Italy, vintage: 2019), [rack], 1);

        Assert.Equal(5, result.Slots[0].Row);
    }

    [Fact]
    public void Same_wine_continues_its_row()
    {
        var sassicaia = Tuscan("Sassicaia", vintage: 2021);
        var rack = Rack("R", 3, 6, (1, 1, sassicaia), (1, 2, sassicaia));

        var result = PlacementPlanner.Plan(sassicaia, [rack], 1);

        Assert.Equal("R R1C3", Slots(result));
        Assert.Contains("Sassicaia", result.Reason);
    }

    [Fact]
    public void Misfit_goes_to_an_empty_area()
    {
        var other = Wine("Riesling", "X", Mosel, "Mosel", Germany, WineType.White);
        var rack = Rack("R", 5, 4,
            (1, 1, other), (1, 2, other), (1, 3, other), (1, 4, other),
            (2, 1, other), (2, 2, other), (2, 3, other), (2, 4, other));

        var result = PlacementPlanner.Plan(Wine("Schaumwein", "Y", null, null, null, WineType.Sparkling), [rack], 1);

        Assert.True(result.Slots[0].Row >= 4, Slots(result));
        Assert.Contains("Freie Ecke", result.Reason);
    }

    // ----- Several bottles -----

    [Fact]
    public void Six_bottles_fill_one_row()
    {
        var rack = Rack("R", 5, 6);
        var result = PlacementPlanner.Plan(Wine("Wein"), [rack], 6);

        Assert.Equal(6, result.Slots.Count);
        Assert.All(result.Slots, s => Assert.Equal(1, s.Row));
        Assert.Equal([1, 2, 3, 4, 5, 6], result.Slots.Select(s => s.Column));
        Assert.Equal(0, result.Unplaceable);
    }

    [Fact]
    public void Section_is_chosen_where_the_neighbours_fit()
    {
        var chianti = Tuscan("Chianti");
        var rack = Rack("R", 4, 6, (3, 1, chianti));
        var result = PlacementPlanner.Plan(Tuscan("Brunello"), [rack], 3);

        Assert.Equal("R R3C2; R R3C3; R R3C4", Slots(result));
    }

    [Fact]
    public void Row_too_short_continues_in_the_adjacent_row()
    {
        var riesling = Wine("Riesling", "X", Mosel, "Mosel", Germany, WineType.White);
        // Row 2: 4 free slots (columns 3..6) next to the Tuscan wines; the other rows are blocked by fillers.
        var tuscan = Tuscan("Chianti");
        var rack = Rack("R", 3, 6,
            (2, 1, tuscan), (2, 2, tuscan),
            (1, 1, riesling), (1, 3, riesling), (1, 5, riesling),
            (3, 1, riesling), (3, 3, riesling), (3, 5, riesling));

        var result = PlacementPlanner.Plan(Tuscan("Brunello"), [rack], 6);

        Assert.Equal(6, result.Slots.Count);
        Assert.Equal(4, result.Slots.Count(s => s.Row == 2));
        Assert.Equal(2, result.Slots.Count(s => s.Row != 2));
        Assert.Equal(6, result.Slots.Select(s => (s.Row, s.Column)).Distinct().Count());
    }

    [Fact]
    public void Bottles_continue_in_another_rack()
    {
        var small = Rack("A klein", 1, 2);
        var big = Rack("B groß", 1, 3);
        var result = PlacementPlanner.Plan(Wine("Wein"), [small, big], 5);

        Assert.Equal(5, result.Slots.Count);
        Assert.Equal(2, result.Slots.Count(s => s.RackName == "A klein"));
        Assert.Equal(3, result.Slots.Count(s => s.RackName == "B groß"));
        Assert.Equal(0, result.Unplaceable);
    }

    // ----- Empty rack, no space, determinism -----

    [Fact]
    public void Empty_rack_starts_top_left()
    {
        var result = PlacementPlanner.Plan(Wine("Wein"), [Rack("Keller", 5, 6)], 2);

        Assert.Equal("Keller R1C1; Keller R1C2", Slots(result));
        Assert.Contains("Noch keine Weine eingelagert", result.Reason);
    }

    [Fact]
    public void Empty_racks_prefer_the_rack_with_more_free_slots_then_the_name()
    {
        var filler = Wine("Füller", type: WineType.White);
        var full = Rack("A voll", 2, 2, (1, 1, filler), (1, 2, filler), (2, 1, filler));
        var roomy = Rack("Z weit", 3, 3);
        var other = Rack("B weit", 3, 3);

        Assert.Equal("Z weit R1C1", Slots(PlacementPlanner.Plan(Wine("Neu"), [full, roomy], 1)));
        Assert.Equal("B weit R1C1", Slots(PlacementPlanner.Plan(Wine("Neu"), [roomy, other], 1)));
    }

    [Fact]
    public void Not_enough_space_reports_the_remainder()
    {
        var filler = Wine("Füller", type: WineType.White);
        var rack = Rack("R", 1, 4, (1, 1, filler), (1, 2, filler));

        var result = PlacementPlanner.Plan(Wine("Neu"), [rack], 3);

        Assert.Equal(2, result.Slots.Count);
        Assert.Equal(1, result.Unplaceable);
        Assert.Contains("1 Flasche", result.Reason);
    }

    [Fact]
    public void No_rack_gives_no_slots()
    {
        var result = PlacementPlanner.Plan(Wine("Neu"), [], 2);

        Assert.Empty(result.Slots);
        Assert.Equal(2, result.Unplaceable);
    }

    [Fact]
    public void Same_input_gives_the_same_result_and_never_a_slot_twice()
    {
        var a = Tuscan("A");
        var rack = Rack("R", 5, 6, (2, 2, a), (3, 4, Wine("B")));
        var wine = Tuscan("Neu");

        var first = PlacementPlanner.Plan(wine, [rack], 7);
        var second = PlacementPlanner.Plan(wine, [rack], 7);

        Assert.Equal(Slots(first), Slots(second));
        Assert.Equal(first.Slots.Count, first.Slots.Select(s => (s.Row, s.Column)).Distinct().Count());
        Assert.DoesNotContain(first.Slots, s => (s.Row, s.Column) is (2, 2) or (3, 4));
    }
}
