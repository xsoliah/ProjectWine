using WineCellar.Application;
using WineCellar.Application.Services;

namespace WineCellar.Api.Endpoints;

public static class OriginEndpoints
{
    public static IEndpointRouteBuilder MapOriginEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/origins").RequireAuthorization().WithTags("Origins");

        // Countries with their regions and how many wines use them.
        group.MapGet("", async (OriginService origins, CancellationToken ct) =>
            TypedResults.Ok(await origins.ListAsync(ct)));

        group.MapPost("countries", async (SaveOriginRequest request, OriginService origins, CancellationToken ct) =>
        {
            var country = await origins.CreateCountryAsync(request, ct);
            return TypedResults.Created($"/api/origins/countries/{country.Id}", country);
        });

        group.MapPut("countries/{id:guid}", async (Guid id, SaveOriginRequest request, OriginService origins, CancellationToken ct) =>
            TypedResults.Ok(await origins.RenameCountryAsync(id, request, ct)));

        group.MapDelete("countries/{id:guid}", async (Guid id, OriginService origins, CancellationToken ct) =>
        {
            await origins.DeleteCountryAsync(id, ct);
            return TypedResults.NoContent();
        });

        // Moves all wines and regions of {id} to {targetId} and deletes {id}.
        group.MapPost("countries/{id:guid}/merge-into/{targetId:guid}", async (Guid id, Guid targetId, OriginService origins, CancellationToken ct) =>
            TypedResults.Ok(await origins.MergeCountryAsync(id, targetId, ct)));

        group.MapPost("countries/{countryId:guid}/regions", async (Guid countryId, SaveOriginRequest request, OriginService origins, CancellationToken ct) =>
        {
            var region = await origins.CreateRegionAsync(countryId, request, ct);
            return TypedResults.Created($"/api/origins/regions/{region.Id}", region);
        });

        group.MapPut("regions/{id:guid}", async (Guid id, SaveOriginRequest request, OriginService origins, CancellationToken ct) =>
            TypedResults.Ok(await origins.RenameRegionAsync(id, request, ct)));

        group.MapDelete("regions/{id:guid}", async (Guid id, OriginService origins, CancellationToken ct) =>
        {
            await origins.DeleteRegionAsync(id, ct);
            return TypedResults.NoContent();
        });

        group.MapPost("regions/{id:guid}/merge-into/{targetId:guid}", async (Guid id, Guid targetId, OriginService origins, CancellationToken ct) =>
            TypedResults.Ok(await origins.MergeRegionAsync(id, targetId, ct)));

        return app;
    }
}
