using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;

namespace WineCellar.Api.Endpoints;

public static class WineEndpoints
{
    public static IEndpointRouteBuilder MapWineEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/wines").RequireAuthorization().WithTags("Wines");

        group.MapGet("", async (string? search, WineType? type, bool? inCellarOnly, WineService wines, CancellationToken ct) =>
            TypedResults.Ok(await wines.ListAsync(new WineQuery(search, type, inCellarOnly ?? true), ct)));

        // Barcode scan: own cellar first, then the external database.
        group.MapGet("lookup/{barcode}", async (string barcode, WineService wines, CancellationToken ct) =>
            TypedResults.Ok(await wines.LookupBarcodeAsync(barcode, ct)));

        group.MapGet("{id:guid}", async (Guid id, WineService wines, CancellationToken ct) =>
            TypedResults.Ok(await wines.GetAsync(id, ct)));

        group.MapPost("", async (SaveWineRequest request, WineService wines, CancellationToken ct) =>
        {
            var wine = await wines.CreateAsync(request, ct);
            return TypedResults.Created($"/api/wines/{wine.Id}", wine);
        });

        group.MapPut("{id:guid}", async (Guid id, SaveWineRequest request, WineService wines, CancellationToken ct) =>
            TypedResults.Ok(await wines.UpdateAsync(id, request, ct)));

        group.MapDelete("{id:guid}", async (Guid id, WineService wines, CancellationToken ct) =>
        {
            await wines.DeleteAsync(id, ct);
            return TypedResults.NoContent();
        });

        group.MapPost("{id:guid}/bottles", async (Guid id, AddBottlesRequest request, WineService wines, CancellationToken ct) =>
            TypedResults.Ok(await wines.AddBottlesAsync(id, request.Count, ct)));

        // Where to put the not yet placed bottles (rule based; changes nothing).
        group.MapGet("{id:guid}/placement-suggestion", async (Guid id, int? count, PlacementSuggestionService suggestions, CancellationToken ct) =>
            TypedResults.Ok(await suggestions.SuggestAsync(id, count, ct)));

        // Drink, sell or gift bottles: removes them from the cellar and creates an archive entry.
        group.MapPost("{id:guid}/consume", async (Guid id, ConsumeRequest request, WineService wines, CancellationToken ct) =>
        {
            var entry = await wines.ConsumeAsync(id, request, ct);
            return TypedResults.Created($"/api/archive/{entry.Id}", entry);
        });

        return app;
    }
}
