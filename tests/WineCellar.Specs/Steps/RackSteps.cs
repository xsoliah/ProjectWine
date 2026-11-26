using Reqnroll;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class RackSteps(TestWorld world)
{
    // ----- Given -----

    [Given(@"ich habe ein Regal ""([^""]*)"" mit Höhe (\d+) und Breite (\d+)")]
    public async Task GivenRack(string name, int height, int width) =>
        world.KnownRacks[name] = (await world.Racks.CreateAsync(new SaveRackRequest(name, height, width))).Id;

    [Given(@"in ""([^""]*)"" Reihe (\d+), Spalte (\d+) liegt eine Flasche ""([^""]*)""")]
    public async Task GivenPlaced(string rack, int row, int column, string wine) =>
        await world.Racks.PlaceAsync(world.KnownRacks[rack],
            new PlaceBottleRequest((await world.FindWineAsync(wine)).Id, row, column));

    /// <summary>Fills the first free slots, row by row.</summary>
    [Given(@"von ""([^""]*)"" liegen (\d+) Flaschen in ""([^""]*)""")]
    public async Task GivenPlacedMany(string wine, int count, string rackName)
    {
        var wineId = (await world.FindWineAsync(wine)).Id;
        for (var i = 0; i < count; i++)
        {
            var rack = await world.Racks.GetAsync(world.KnownRacks[rackName]);
            var (row, column) = FirstFree(rack);
            await world.Racks.PlaceAsync(rack.Id, new PlaceBottleRequest(wineId, row, column));
        }
    }

    // ----- When -----

    [When(@"ich ein Regal ""([^""]*)"" mit Höhe (-?\d+) und Breite (-?\d+) anlege")]
    public async Task WhenCreate(string name, int height, int width) =>
        await world.TryAsync(async () =>
            world.KnownRacks[name] = (await world.Racks.CreateAsync(new SaveRackRequest(name, height, width))).Id);

    [When(@"ich das Regal ""([^""]*)"" in ""([^""]*)"" umbenenne")]
    public async Task WhenRename(string from, string to) =>
        await world.TryAsync(async () =>
        {
            var rack = await world.Racks.GetAsync(world.KnownRacks[from]);
            await world.Racks.UpdateAsync(rack.Id, new SaveRackRequest(to, rack.Height, rack.Width));
        });

    [When(@"ich die Maße von ""([^""]*)"" auf Höhe (\d+) und Breite (\d+) ändere")]
    public async Task WhenResize(string name, int height, int width) =>
        await world.TryAsync(async () =>
            await world.Racks.UpdateAsync(world.KnownRacks[name], new SaveRackRequest(name, height, width)));

    [When(@"ich das Regal ""([^""]*)"" abrufe")]
    public async Task WhenGet(string name) =>
        await world.TryAsync(async () => await world.Racks.GetAsync(world.KnownRacks[name]));

    [When(@"ich das Regal ""([^""]*)"" lösche")]
    public async Task WhenDelete(string name) =>
        await world.TryAsync(async () => await world.Racks.DeleteAsync(world.KnownRacks[name]));

    [When(@"ich eine Flasche ""([^""]*)"" in ""([^""]*)"" Reihe (\d+), Spalte (\d+) lege")]
    public async Task WhenPlace(string wine, string rack, int row, int column) =>
        await world.TryAsync(async () =>
        {
            var wineId = world.KnownWines.TryGetValue(wine, out var known) ? known : (await world.FindWineAsync(wine)).Id;
            await world.Racks.PlaceAsync(world.KnownRacks[rack], new PlaceBottleRequest(wineId, row, column));
        });

    [When(@"ich die Flasche aus ""([^""]*)"" Reihe (\d+), Spalte (\d+) nach ""([^""]*)"" Reihe (\d+), Spalte (\d+) verschiebe")]
    public async Task WhenMove(string rack, int row, int column, string target, int targetRow, int targetColumn) =>
        await world.TryAsync(async () =>
        {
            var slot = await SlotAsync(rack, row, column);
            await world.Racks.MoveAsync(slot.Id, new MoveBottleRequest(world.KnownRacks[target], targetRow, targetColumn));
        });

    [When(@"ich die Flasche aus ""([^""]*)"" Reihe (\d+), Spalte (\d+) herausnehme")]
    public async Task WhenRemove(string rack, int row, int column) =>
        await world.TryAsync(async () => await world.Racks.RemoveAsync((await SlotAsync(rack, row, column)).Id));

    [When(@"ich die Flasche aus ""([^""]*)"" Reihe (\d+), Spalte (\d+) trinke")]
    public async Task WhenDrinkFromSlot(string rack, int row, int column) =>
        await world.TryAsync(async () => world.LastArchiveEntry = await world.Racks.ConsumeFromSlotAsync(
            (await SlotAsync(rack, row, column)).Id, new ConsumeRequest(Domain.ConsumptionKind.Drunk)));

    [When(@"ich die Flaschenanzahl von ""([^""]*)"" auf (\d+) ändere")]
    public async Task WhenChangeQuantity(string name, int quantity) =>
        await world.TryAsync(async () =>
        {
            var wine = await world.FindWineAsync(name);
            await world.Wines.UpdateAsync(wine.Id, GrapeSteps.ToSaveRequest(wine) with { Quantity = quantity });
        });

    [When(@"ich den Wein ""([^""]*)"" lösche")]
    public async Task WhenDeleteWine(string name) =>
        await world.TryAsync(async () => await world.Wines.DeleteAsync((await world.FindWineAsync(name)).Id));

    // ----- Then -----

    [Then(@"existiert das Regal ""([^""]*)"" mit einer Kapazität von (\d+) Fächern")]
    public async Task ThenCapacity(string name, int capacity)
    {
        var rack = Assert.Single(await world.Racks.ListAsync(), r => r.Name == name);
        Assert.Equal(capacity, rack.Capacity);
    }

    [Then(@"hat das Regal ""([^""]*)"" (\d+) belegte und (\d+) freie Fächer")]
    public async Task ThenOccupancy(string name, int occupied, int free)
    {
        var rack = Assert.Single(await world.Racks.ListAsync(), r => r.Name == name);
        Assert.Equal(occupied, rack.Occupied);
        Assert.Equal(free, rack.Free);
    }

    [Then(@"gibt es kein Regal ""([^""]*)""")]
    public async Task ThenNoRack(string name) =>
        Assert.DoesNotContain(await world.Racks.ListAsync(), r => r.Name.Trim() == name.Trim());

    [Then(@"zeigt meine Regalliste ""([^""]*)""")]
    public async Task ThenRackList(string expected) =>
        Assert.Equal(expected, string.Join(", ", (await world.Racks.ListAsync()).Select(r => r.Name)));

    [Then(@"ist ""([^""]*)"" Reihe (\d+), Spalte (\d+) mit ""([^""]*)"" belegt")]
    public async Task ThenOccupied(string rack, int row, int column, string wine) =>
        Assert.Equal(wine, (await SlotAsync(rack, row, column)).Wine.Name);

    [Then(@"ist ""([^""]*)"" Reihe (\d+), Spalte (\d+) frei")]
    public async Task ThenFree(string rack, int row, int column)
    {
        var dto = await world.Racks.GetAsync(world.KnownRacks[rack]);
        Assert.DoesNotContain(dto.Slots, s => s.Row == row && s.Column == column);
    }

    [Then(@"sind von ""([^""]*)"" (\d+) Flaschen? eingelagert und (\d+) nicht eingelagert")]
    public async Task ThenPlacedCounts(string name, int placed, int unplaced)
    {
        var wine = await world.FindWineAsync(name);
        Assert.Equal(placed, wine.Slots.Count);
        Assert.Equal(unplaced, wine.UnplacedCount);
    }

    [Then(@"werden keine Fächer als freigegeben gemeldet")]
    public void ThenNothingFreed()
    {
        Assert.Null(world.LastError);
        Assert.Empty(world.LastArchiveEntry!.FreedSlots ?? []);
    }

    [Then(@"werden als freigegeben gemeldet ""([^""]*)""")]
    public void ThenFreed(string expected)
    {
        Assert.Null(world.LastError);
        Assert.Equal(expected, Describe(world.LastArchiveEntry!.FreedSlots ?? []));
    }

    [Then(@"zeigt der Wein ""([^""]*)"" die Fächer ""([^""]*)""")]
    public async Task ThenWineSlots(string name, string expected) =>
        Assert.Equal(expected, Describe((await world.FindWineAsync(name)).Slots));

    // ----- Helpers -----

    private static string Describe(IEnumerable<SlotLocationDto> slots) =>
        string.Join("; ", slots.Select(s => $"{s.RackName} – Reihe {s.Row}, Spalte {s.Column}"));

    private async Task<RackSlotDto> SlotAsync(string rack, int row, int column)
    {
        var dto = await world.Racks.GetAsync(world.KnownRacks[rack]);
        return dto.Slots.FirstOrDefault(s => s.Row == row && s.Column == column)
               ?? throw new InvalidOperationException($"In {rack} Reihe {row}, Spalte {column} liegt keine Flasche.");
    }

    private static (int Row, int Column) FirstFree(RackDto rack)
    {
        for (var row = 1; row <= rack.Height; row++)
        for (var column = 1; column <= rack.Width; column++)
            if (!rack.Slots.Any(s => s.Row == row && s.Column == column))
                return (row, column);
        throw new InvalidOperationException($"Das Regal {rack.Name} ist voll.");
    }
}
