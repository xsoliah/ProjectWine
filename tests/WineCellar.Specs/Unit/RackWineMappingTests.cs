using Microsoft.EntityFrameworkCore;
using WineCellar.Application;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Unit;

public class RackWineMappingTests
{
    [Fact]
    public async Task Rack_slots_carry_the_label_image_id_of_their_wine()
    {
        using var world = new TestWorld();
        await world.LoginAsync("anna");
        var withLabel = await world.SeedWineAsync("Sassicaia", 1);
        var without = await world.SeedWineAsync("Zweigelt", 1);
        var rack = await world.Racks.CreateAsync(new SaveRackRequest("Keller", 2, 2));
        await world.Racks.PlaceAsync(rack.Id, new PlaceBottleRequest(withLabel.Id, 1, 1));
        await world.Racks.PlaceAsync(rack.Id, new PlaceBottleRequest(without.Id, 1, 2));

        var labelId = Guid.NewGuid();
        var entity = await world.Db.Wines.SingleAsync(w => w.Id == withLabel.Id);
        entity.LabelImageId = labelId;
        await world.Db.SaveChangesAsync();

        var slots = (await world.Racks.GetAsync(rack.Id)).Slots;
        Assert.Equal(labelId, slots.Single(s => s.Wine.Name == "Sassicaia").Wine.LabelImageId);
        Assert.Null(slots.Single(s => s.Wine.Name == "Zweigelt").Wine.LabelImageId);
    }
}
