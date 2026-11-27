using Microsoft.EntityFrameworkCore;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// Estimates the drinking curve (optimal year and spread) of an existing wine with one text-only research,
/// counted towards the daily limit. The drinking window stays untouched.
/// </summary>
public class DrinkingCurveService(
    IAppDbContext db,
    ICurrentUser user,
    IWineResearchAgent agent,
    CaptureService captures,
    TimeProvider time)
{
    public async Task<WineDto> EstimateAsync(Guid wineId, CancellationToken ct = default)
    {
        captures.EnsureEnabled();
        var wine = await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .Include(w => w.Grapes).ThenInclude(g => g.GrapeVariety)
            .FirstOrDefaultAsync(w => w.Id == wineId && w.OwnerId == user.UserId, ct)
            ?? throw new NotFoundException("Wein nicht gefunden.");
        await captures.EnsureQuotaAvailableAsync(ct);

        WineResearchResult result;
        try
        {
            result = await agent.ResearchAsync([], Describe(wine), null, ct, curveOnly: true);
        }
        catch (WineResearchException ex)
        {
            throw new ServiceUnavailableException(ex.Message);
        }

        // The research ran, so it counts, even when it found nothing usable.
        await captures.ConsumeQuotaAndSaveAsync(ct);

        var year = time.GetUtcNow().Year;
        var clean = CaptureProcessor.Sanitize(result with { Vintage = null, DrinkFrom = null, DrinkUntil = null }, year);
        if (clean.DrinkPeak is not { } peak || clean.DrinkSpread is not { } spread
            || !DrinkingCurve.IsPlausible(peak.Value, spread.Value, wine.Vintage, year))
            throw new DomainException("Für diesen Wein konnte kein Trinkzeitpunkt ermittelt werden.");

        wine.DrinkPeak = peak.Value;
        wine.DrinkSpread = spread.Value;
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    internal static string Describe(Wine wine)
    {
        var parts = new List<string> { wine.Name };
        if (!string.IsNullOrWhiteSpace(wine.Producer)) parts.Add($"Winzer: {wine.Producer}");
        if (wine.Vintage is { } v) parts.Add($"Jahrgang: {v}");
        parts.Add($"Art: {wine.Type}");
        var origin = string.Join(", ", new[] { wine.Region?.Name, wine.Country?.Name }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (origin.Length > 0) parts.Add($"Herkunft: {origin}");
        var grapes = string.Join(", ", wine.Grapes.OrderBy(g => g.Position).Select(g => g.GrapeVariety.Name));
        if (grapes.Length > 0) parts.Add($"Rebsorten: {grapes}");
        if (wine.BottleSizeMl != 750) parts.Add($"Flaschengröße: {wine.BottleSizeMl} ml");
        return string.Join("; ", parts);
    }
}
