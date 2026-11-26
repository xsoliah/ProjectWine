using WineCellar.Application;
using WineCellar.Application.Services;

namespace WineCellar.Api.Endpoints;

public static class GrapeEndpoints
{
    public static IEndpointRouteBuilder MapGrapeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/grapes").RequireAuthorization().WithTags("Grapes");

        // Grape varieties with how many wines use them.
        group.MapGet("", async (GrapeService grapes, CancellationToken ct) =>
            TypedResults.Ok(await grapes.ListAsync(ct)));

        group.MapPost("", async (SaveOriginRequest request, GrapeService grapes, CancellationToken ct) =>
        {
            var grape = await grapes.CreateAsync(request, ct);
            return TypedResults.Created($"/api/grapes/{grape.Id}", grape);
        });

        group.MapPut("{id:guid}", async (Guid id, SaveOriginRequest request, GrapeService grapes, CancellationToken ct) =>
            TypedResults.Ok(await grapes.RenameAsync(id, request, ct)));

        group.MapDelete("{id:guid}", async (Guid id, GrapeService grapes, CancellationToken ct) =>
        {
            await grapes.DeleteAsync(id, ct);
            return TypedResults.NoContent();
        });

        // All wines of {id} get {targetId} instead; {id} is deleted.
        group.MapPost("{id:guid}/merge-into/{targetId:guid}", async (Guid id, Guid targetId, GrapeService grapes, CancellationToken ct) =>
            TypedResults.Ok(await grapes.MergeAsync(id, targetId, ct)));

        return app;
    }
}
