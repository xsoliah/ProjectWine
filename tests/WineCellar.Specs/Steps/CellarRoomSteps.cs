using Reqnroll;
using WineCellar.Application;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class CellarRoomSteps(TestWorld world)
{
    // ----- Given -----

    [Given(@"ich habe einen Rotwein ""([^""]*)"" und einen Weißwein ""([^""]*)""")]
    public async Task GivenWines(string red, string white)
    {
        world.KnownWines[red] = (await world.Wines.CreateAsync(new SaveWineRequest(null, red, Type: WineType.Red, Quantity: 5))).Id;
        world.KnownWines[white] = (await world.Wines.CreateAsync(new SaveWineRequest(null, white, Type: WineType.White, Quantity: 5))).Id;
    }

    [Given(@"ich setze das Regal ""([^""]*)"" an Position (\d+) / (\d+) mit Drehung (\d+)")]
    public async Task GivenPlaced(string rack, int x, int z, int rotation) =>
        await world.CellarRooms.PlaceAsync(world.KnownRacks[rack], new PlaceRackRequest(x, z, rotation));

    // ----- When -----

    [When(@"ich den Kellerraum abrufe")]
    public async Task WhenGet() => world.LastRoom = await world.CellarRooms.GetAsync();

    [When(@"ich die Raummaße auf (-?\d+) x (-?\d+) x (-?\d+) cm speichere")]
    public async Task WhenSave(int width, int depth, int height) =>
        await world.TryAsync(async () =>
            world.LastRoom = await world.CellarRooms.SaveAsync(new SaveCellarRoomRequest(width, depth, height)));

    [When(@"ich das Regal ""([^""]*)"" an Position (\d+) / (\d+) mit Drehung (\d+) setze")]
    public async Task WhenPlace(string rack, int x, int z, int rotation) =>
        await world.TryAsync(async () =>
            await world.CellarRooms.PlaceAsync(world.KnownRacks[rack], new PlaceRackRequest(x, z, rotation)));

    [When(@"ich das Regal ""([^""]*)"" aus dem Raum nehme")]
    public async Task WhenClear(string rack) =>
        await world.TryAsync(async () => await world.CellarRooms.ClearPlacementAsync(world.KnownRacks[rack]));

    // ----- Then -----

    [Then(@"misst der Raum (\d+) x (\d+) x (\d+) cm")]
    public async Task ThenSize(int width, int depth, int height)
    {
        var room = await world.CellarRooms.GetAsync();
        Assert.Equal((width, depth, height), (room.WidthCm, room.DepthCm, room.HeightCm));
    }

    [Then(@"steht das Regal ""([^""]*)"" an Position (\d+) / (\d+) mit Drehung (\d+)")]
    public async Task ThenPlaced(string rack, int x, int z, int rotation)
    {
        var placement = (await RoomRackAsync(rack)).Placement;
        Assert.NotNull(placement);
        Assert.Equal((x, z, rotation), (placement!.X, placement.Z, placement.Rotation));
    }

    [Then(@"ist das Regal ""([^""]*)"" nicht platziert")]
    public async Task ThenNotPlaced(string rack) => Assert.Null((await RoomRackAsync(rack)).Placement);

    [Then(@"belegt das Regal ""([^""]*)"" (\d+) x (\d+) cm")]
    public async Task ThenFootprint(string name, int width, int depth)
    {
        var rack = await world.Db.Racks.FindAsync(world.KnownRacks[name]);
        var footprint = rack!.CurrentFootprint;
        Assert.NotNull(footprint);
        Assert.Equal((width, depth), (footprint!.Value.Width, footprint.Value.Depth));
    }

    [Then(@"hat das Regal ""([^""]*)"" die Breite (\d+)")]
    public async Task ThenWidth(string name, int width) =>
        Assert.Equal(width, (await world.Racks.GetAsync(world.KnownRacks[name])).Width);

    [Then(@"zeigt der Raum die platzierten Regale ""([^""]*)""")]
    public void ThenPlacedList(string names) =>
        Assert.Equal(names, string.Join(", ", world.LastRoom!.Racks.Where(r => r.Placement is not null).Select(r => r.Name)));

    [Then(@"zeigt der Raum die nicht platzierten Regale ""([^""]*)""")]
    public void ThenUnplacedList(string names) =>
        Assert.Equal(names, string.Join(", ", world.LastRoom!.Racks.Where(r => r.Placement is null).Select(r => r.Name)));

    [Then(@"zeigt das Regal ""([^""]*)"" im Raum (\d+) belegte Fächer, davon (\d+) Rotwein und (\d+) Weißwein")]
    public void ThenOccupancyTypes(string name, int occupied, int red, int white)
    {
        var rack = Assert.Single(world.LastRoom!.Racks, r => r.Name == name);
        Assert.Equal(occupied, rack.Slots.Count);
        Assert.Equal(red, rack.Slots.Count(s => s.Type == WineType.Red));
        Assert.Equal(white, rack.Slots.Count(s => s.Type == WineType.White));
    }

    [Then(@"zeigt der Raum keine Regale")]
    public void ThenNoRacks() => Assert.Empty(world.LastRoom!.Racks);

    // ----- Door and elevation -----

    [Given(@"ich setze das Regal ""([^""]*)"" an Position (\d+) / (\d+) mit Drehung (\d+) auf (\d+) cm Höhe")]
    public async Task GivenPlacedElevated(string rack, int x, int z, int rotation, int elevation) =>
        await world.CellarRooms.PlaceAsync(world.KnownRacks[rack], new PlaceRackRequest(x, z, rotation, elevation));

    [Given(@"ich setze eine Tür an der Wand ""([^""]*)"" mit Abstand (\d+) cm")]
    public async Task GivenDoor(string wall, int offset) =>
        await world.CellarRooms.SetDoorAsync(new SetDoorRequest(WallIndex(wall), offset));

    [When(@"ich eine Tür an der Wand ""([^""]*)"" mit Abstand (\d+) cm setze")]
    public async Task WhenDoor(string wall, int offset) =>
        await world.TryAsync(async () => await world.CellarRooms.SetDoorAsync(new SetDoorRequest(WallIndex(wall), offset)));

    [When(@"ich die Tür entferne")]
    public async Task WhenClearDoor() => await world.TryAsync(async () => await world.CellarRooms.ClearDoorAsync());

    [When(@"ich das Regal ""([^""]*)"" an Position (\d+) / (\d+) mit Drehung (\d+) auf (-?\d+) cm Höhe setze")]
    public async Task WhenPlaceElevated(string rack, int x, int z, int rotation, int elevation) =>
        await world.TryAsync(async () =>
            await world.CellarRooms.PlaceAsync(world.KnownRacks[rack], new PlaceRackRequest(x, z, rotation, elevation)));

    [Then(@"hat der Raum eine Tür an der Wand ""([^""]*)"" mit Abstand (\d+) cm")]
    public async Task ThenDoor(string wall, int offset)
    {
        var door = (await world.CellarRooms.GetAsync()).Door;
        Assert.NotNull(door);
        Assert.Equal((WallIndex(wall), offset), (door!.Wall, door.OffsetCm));
    }

    [Then(@"hat der Raum keine Tür")]
    public async Task ThenNoDoor() => Assert.Null((await world.CellarRooms.GetAsync()).Door);

    [Then(@"steht das Regal ""([^""]*)"" (\d+) cm über dem Boden")]
    public async Task ThenElevation(string rack, int elevation)
    {
        var room = await world.CellarRooms.GetAsync();
        var r = Assert.Single(room.Racks, x => x.Id == world.KnownRacks[rack]);
        Assert.Equal(elevation, r.Placement?.ElevationCm ?? 0);
    }

    // Walls: 0 = back, 1 = right, 2 = front, 3 = left; unknown names map to an invalid index.
    private static int WallIndex(string wall) => wall switch
    {
        "hinten" => 0,
        "rechts" => 1,
        "vorne" => 2,
        "links" => 3,
        _ => 9,
    };

    private async Task<RoomRackDto> RoomRackAsync(string name) =>
        Assert.Single((await world.CellarRooms.GetAsync()).Racks, r => r.Id == world.KnownRacks[name]);
}
