using WineCellar.Application;
using WineCellar.Application.Services;

namespace WineCellar.Api.Endpoints;

public static class RackEndpoints
{
    public static IEndpointRouteBuilder MapRackEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/racks").RequireAuthorization().WithTags("Racks");

        // Overview: capacity, occupied and free slots per rack.
        group.MapGet("", async (RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.ListAsync(ct)));

        // The grid: dimensions and all occupied slots with short wine info.
        group.MapGet("{id:guid}", async (Guid id, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.GetAsync(id, ct)));

        group.MapPost("", async (SaveRackRequest request, RackService racks, CancellationToken ct) =>
        {
            var rack = await racks.CreateAsync(request, ct);
            return TypedResults.Created($"/api/racks/{rack.Id}", rack);
        });

        group.MapPut("{id:guid}", async (Guid id, SaveRackRequest request, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.UpdateAsync(id, request, ct)));

        group.MapDelete("{id:guid}", async (Guid id, RackService racks, CancellationToken ct) =>
        {
            await racks.DeleteAsync(id, ct);
            return TypedResults.NoContent();
        });

        // Put one bottle into a free slot.
        group.MapPost("{id:guid}/slots", async (Guid id, PlaceBottleRequest request, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.PlaceAsync(id, request, ct)));

        // Put several bottles of one wine into free slots, all or nothing (see the placement suggestion).
        group.MapPost("placements", async (PlaceBottlesRequest request, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.PlaceManyAsync(request, ct)));

        // Move a bottle (same or other rack).
        group.MapPut("slots/{slotId:guid}", async (Guid slotId, MoveBottleRequest request, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.MoveAsync(slotId, request, ct)));

        // Take a bottle out of its slot (it stays in the cellar).
        group.MapDelete("slots/{slotId:guid}", async (Guid slotId, RackService racks, CancellationToken ct) =>
            TypedResults.Ok(await racks.RemoveAsync(slotId, ct)));

        // Drink, sell or gift exactly this bottle.
        group.MapPost("slots/{slotId:guid}/consume", async (Guid slotId, ConsumeRequest request, RackService racks, CancellationToken ct) =>
        {
            var entry = await racks.ConsumeFromSlotAsync(slotId, request, ct);
            return TypedResults.Created($"/api/archive/{entry.Id}", entry);
        });

        return app;
    }
}
