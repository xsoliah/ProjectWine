using Microsoft.EntityFrameworkCore;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// The bottle of a wine: adjusting outline and label placement (no limit) and detecting the bottle afterwards from the
/// stored original photo (one research, counts towards the daily limit).
/// </summary>
public class BottleShapeService(
    IAppDbContext db,
    ICurrentUser user,
    ImageService images,
    BottleAnalyzer bottles,
    IWineResearchAgent agent,
    CaptureService captures)
{
    /// <summary>Adjusts outline and/or label placement, cuts the bottle again and confirms it. No research, no quota.</summary>
    public async Task<WineDto> SetAsync(Guid wineId, SetBottleShapeRequest request, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        var source = await LoadSourceAsync(wine, ct);
        var placement = request.Label ?? throw new DomainException("Bitte die Lage des Etiketts angeben.");
        var analysis = bottles.Adjust(source.Data, BottleShapeJson.Deserialize(wine.BottleShapeJson),
            CaptureService.ToOutline(request.Outline), placement, wine.Type);
        await ApplyAsync(wine, analysis, ct);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Detects the bottle on the original photo: one research call, counted towards the daily limit.</summary>
    public async Task<WineDto> DetectAsync(Guid wineId, CancellationToken ct = default)
    {
        captures.EnsureEnabled();
        var wine = await FindWineAsync(wineId, ct);
        var source = await LoadSourceAsync(wine, ct);
        await captures.EnsureQuotaAvailableAsync(ct);

        WineResearchResult result;
        try
        {
            result = await agent.ResearchAsync([new ResearchImage(source.Data, source.ContentType)], null, null, ct, bottleOnly: true);
        }
        catch (WineResearchException ex)
        {
            throw new ServiceUnavailableException(ex.Message);
        }

        // The corners the user confirmed belong to the same photo and win over the agent's.
        var corners = LabelCornersJson.Deserialize(wine.LabelCornersJson) ?? result.LabelCorners;
        var sanitized = CaptureProcessor.Sanitize(result, DateTime.UtcNow.Year);
        var analysis = bottles.Analyze(source.Data, sanitized.Bottle, corners is { } c && c.IsPlausible() ? c : null, wine.Type);
        await ApplyAsync(wine, analysis, ct);
        await captures.ConsumeQuotaAndSaveAsync(ct);
        return wine.ToDto();
    }

    private async Task ApplyAsync(Wine wine, BottleAnalysis analysis, CancellationToken ct)
    {
        await images.RemoveAsync([wine.BottleImageId], ct);
        wine.BottleImageId = analysis.Image is { } png
            ? images.AddGenerated(png, BottleImageFormat.ContentType, user.UserId).Id
            : null;
        wine.BottleShapeJson = BottleShapeJson.Serialize(analysis.Shape);
    }

    private async Task<StoredImage> LoadSourceAsync(Wine wine, CancellationToken ct) =>
        wine.LabelSourceImageId is { } id
            ? await images.GetAsync(id, ct)
            : throw new DomainException("Für diesen Wein ist kein Originalfoto gespeichert. Bitte zuerst ein Foto des Etiketts aufnehmen.");

    private async Task<Wine> FindWineAsync(Guid id, CancellationToken ct) =>
        await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .FirstOrDefaultAsync(w => w.Id == id && w.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Wein nicht gefunden.");
}
