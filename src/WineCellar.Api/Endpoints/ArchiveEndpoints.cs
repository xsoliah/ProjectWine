using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;

namespace WineCellar.Api.Endpoints;

public static class ArchiveEndpoints
{
    public static IEndpointRouteBuilder MapArchiveEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/archive").RequireAuthorization().WithTags("Archive");

        group.MapGet("", async (ConsumptionKind? kind, ArchiveService archive, CancellationToken ct) =>
            TypedResults.Ok(await archive.ListAsync(kind, ct)));

        // Rate a drunk wine (also afterwards) or correct buyer/recipient and price.
        group.MapPut("{id:guid}", async (Guid id, UpdateArchiveEntryRequest request, ArchiveService archive, CancellationToken ct) =>
            TypedResults.Ok(await archive.UpdateAsync(id, request, ct)));

        // Undo: bottles go back into the cellar.
        group.MapDelete("{id:guid}", async (Guid id, ArchiveService archive, CancellationToken ct) =>
        {
            await archive.DeleteAsync(id, ct);
            return TypedResults.NoContent();
        });

        return app;
    }
}
