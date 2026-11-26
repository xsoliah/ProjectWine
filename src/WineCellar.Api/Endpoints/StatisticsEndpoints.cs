using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;

namespace WineCellar.Api.Endpoints;

public static class StatisticsEndpoints
{
    public static IEndpointRouteBuilder MapStatisticsEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/statistics?groupBy=Type|Country|Region|Producer|Grape[&countryId=...][&cuvee=true]
        app.MapGet("/api/statistics", async (string? groupBy, Guid? countryId, bool? cuvee, StatisticsService statistics, CancellationToken ct) =>
            {
                var grouping = StatisticsGrouping.Type;
                if (!string.IsNullOrEmpty(groupBy) &&
                    (!Enum.TryParse(groupBy, ignoreCase: true, out grouping) || !Enum.IsDefined(grouping)))
                {
                    throw new DomainException($"Unbekannte Gruppierung '{groupBy}'. Erlaubt: Type, Country, Region, Producer, Grape.");
                }

                return TypedResults.Ok(await statistics.GetAsync(grouping, countryId, cuvee ?? false, ct));
            })
            .RequireAuthorization()
            .WithTags("Statistics");

        return app;
    }
}
