using WineCellar.Application;
using WineCellar.Application.Services;

namespace WineCellar.Api.Endpoints;

public static class CellarRoomEndpoints
{
    public static IEndpointRouteBuilder MapCellarRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var room = app.MapGroup("/api/cellar-room").RequireAuthorization().WithTags("CellarRoom");

        // Room dimensions plus all racks with their placement and compact occupancy.
        room.MapGet("", async (CellarRoomService rooms, CancellationToken ct) =>
            TypedResults.Ok(await rooms.GetAsync(ct)));

        room.MapPut("", async (SaveCellarRoomRequest request, CellarRoomService rooms, CancellationToken ct) =>
            TypedResults.Ok(await rooms.SaveAsync(request, ct)));

        var placement = app.MapGroup("/api/racks/{id:guid}/placement").RequireAuthorization().WithTags("CellarRoom");

        placement.MapPut("", async (Guid id, PlaceRackRequest request, CellarRoomService rooms, CancellationToken ct) =>
            TypedResults.Ok(await rooms.PlaceAsync(id, request, ct)));

        placement.MapDelete("", async (Guid id, CellarRoomService rooms, CancellationToken ct) =>
            TypedResults.Ok(await rooms.ClearPlacementAsync(id, ct)));

        return app;
    }
}
