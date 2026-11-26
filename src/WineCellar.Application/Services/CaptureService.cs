using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>Photo capture drafts of the current user: create, list, review, adjust the label cut, accept, discard.</summary>
public class CaptureService(
    IAppDbContext db,
    ICurrentUser user,
    ImageService images,
    ILabelImageExtractor extractor,
    ICaptureAvailability availability,
    ICaptureQueue queue,
    IOptions<PhotoCaptureOptions> options,
    TimeProvider time)
{
    private int Limit => options.Value.DailyLimitPerUser;

    public async Task<CaptureQuotaDto> GetQuotaAsync(CancellationToken ct = default)
    {
        var today = Today();
        var used = await db.CaptureUsages
            .Where(u => u.OwnerId == user.UserId && u.Day == today)
            .Select(u => u.Count)
            .FirstOrDefaultAsync(ct);
        return new CaptureQuotaDto(Limit, used, Math.Max(0, Limit - used), availability.IsEnabled);
    }

    /// <summary>Stores the photos and a waiting draft; the research runs in the background.</summary>
    public async Task<CaptureSummaryDto> CreateAsync(byte[]? front, byte[]? back, int bottleCount, string? note, CancellationToken ct = default)
    {
        EnsureEnabled();
        if (front is null || front.Length == 0) throw new DomainException("Bitte ein Foto des Etiketts aufnehmen.");
        if (bottleCount is < 1 or > 999) throw new DomainException("Die Anzahl der Flaschen muss zwischen 1 und 999 liegen.");
        var cleanNote = Mapping.Clean(note);
        if (cleanNote?.Length > CaptureDraft.MaxNoteLength)
            throw new DomainException($"Die Notiz darf höchstens {CaptureDraft.MaxNoteLength} Zeichen lang sein.");

        // Validate the files before counting anything against the limit.
        var frontImage = images.Add(front);
        var backImage = back is { Length: > 0 } ? images.Add(back) : null;
        var draft = new CaptureDraft
        {
            OwnerId = user.UserId,
            FrontImageId = frontImage.Id,
            BackImageId = backImage?.Id,
            BottleCount = bottleCount,
            UserNote = cleanNote,
            CreatedAt = time.GetUtcNow().UtcDateTime
        };
        db.CaptureDrafts.Add(draft);
        await ConsumeQuotaAndSaveAsync(ct);
        queue.Notify();
        return ToSummary(draft, null);
    }

    /// <summary>Own drafts, newest first. Also wakes the worker in case it missed pending drafts.</summary>
    public async Task<IReadOnlyList<CaptureSummaryDto>> ListAsync(CancellationToken ct = default)
    {
        var drafts = await db.CaptureDrafts.AsNoTracking()
            .Where(d => d.OwnerId == user.UserId)
            .ToListAsync(ct);
        if (drafts.Any(d => d.Status == CaptureStatus.Pending)) queue.Notify();
        return drafts
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => ToSummary(d, ReadResult(d.ResultJson)))
            .ToList();
    }

    /// <summary>Number of finished drafts not yet taken over (navigation badge).</summary>
    public Task<int> CountReadyAsync(CancellationToken ct = default) =>
        db.CaptureDrafts.CountAsync(d => d.OwnerId == user.UserId && d.Status == CaptureStatus.Ready, ct);

    /// <summary>Finished and all drafts (the navigation shows "Entwürfe" on phones only when there are any).</summary>
    public async Task<CaptureCountsDto> CountAsync(CancellationToken ct = default)
    {
        var statuses = await db.CaptureDrafts.Where(d => d.OwnerId == user.UserId).Select(d => d.Status).ToListAsync(ct);
        return new CaptureCountsDto(statuses.Count(s => s == CaptureStatus.Ready), statuses.Count);
    }

    public async Task<CaptureDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var draft = await FindAsync(id, ct);
        var result = ReadResult(draft.ResultJson);
        var sources = string.IsNullOrEmpty(draft.SourcesJson)
            ? []
            : JsonSerializer.Deserialize<List<WebSource>>(draft.SourcesJson, LabelCornersJson.Options) ?? [];

        Guid? countryId = null, regionId = null;
        if (result?.Country?.Value is { } countryName)
        {
            var normalized = OriginName.Normalize(countryName);
            var country = await db.Countries.Include(c => c.Regions)
                .FirstOrDefaultAsync(c => c.OwnerId == user.UserId && c.NormalizedName == normalized, ct);
            countryId = country?.Id;
            if (country is not null && result.Region?.Value is { } regionName)
                regionId = country.Regions.FirstOrDefault(r => r.NormalizedName == OriginName.Normalize(regionName))?.Id;
        }

        var ownGrapes = await db.GrapeVarieties.Where(g => g.OwnerId == user.UserId)
            .Select(g => new { g.Id, g.NormalizedName }).ToListAsync(ct);
        var grapes = (result?.Grapes ?? [])
            .Select(g => new CaptureGrapeDto(g.Name, g.Percent, g.Source,
                ownGrapes.FirstOrDefault(o => o.NormalizedName == OriginName.Normalize(g.Name))?.Id))
            .ToList();

        var existing = result is null ? null : await FindExistingWineAsync(result, ct);
        var corners = LabelCornersJson.Deserialize(draft.LabelCornersJson);
        var webFound = result is not null && FieldsOf(result).Any(s => s == FieldSource.Web);

        return new CaptureDetailDto(
            ToSummary(draft, result),
            draft.BackImageId,
            draft.UserNote,
            corners is null ? null : LabelCornersJson.ToDto(corners),
            corners is not null,
            result?.Summary,
            NothingFoundOnWeb: draft.Status == CaptureStatus.Ready && !webFound,
            F(result?.Name), F(result?.Producer), F(result?.Vintage), F(result?.Type), F(result?.Country),
            F(result?.Region), F(result?.BottleSizeMl), F(result?.DrinkFrom), F(result?.DrinkUntil),
            F(result?.Barcode), F(result?.Notes),
            grapes, sources, countryId, regionId, existing?.ToDto());
    }

    /// <summary>Researches the draft again (failed or finished); counts towards the daily limit.</summary>
    public async Task<CaptureSummaryDto> RetryAsync(Guid id, CancellationToken ct = default)
    {
        EnsureEnabled();
        var draft = await FindAsync(id, ct);
        if (draft.Status is CaptureStatus.Pending or CaptureStatus.Researching)
            throw new ConflictException("Dieser Entwurf wird bereits recherchiert.");

        await images.RemoveAsync([draft.LabelPreviewImageId], ct);
        draft.Status = CaptureStatus.Pending;
        draft.Attempts = 0;
        draft.Error = null;
        draft.ResultJson = null;
        draft.SourcesJson = null;
        draft.LabelCornersJson = null;
        draft.LabelPreviewImageId = null;
        draft.StartedAt = null;
        draft.CompletedAt = null;
        draft.Touch();
        await ConsumeQuotaAndSaveAsync(ct);
        queue.Notify();
        return ToSummary(draft, null);
    }

    /// <summary>Adjusts the label corners of a finished draft and cuts the preview again (no research, no quota).</summary>
    public async Task<CaptureDetailDto> SetLabelCornersAsync(Guid id, IReadOnlyList<LabelPointDto>? corners, CancellationToken ct = default)
    {
        var draft = await FindAsync(id, ct);
        if (draft.Status != CaptureStatus.Ready)
            throw new ConflictException("Der Zuschnitt kann erst angepasst werden, wenn die Recherche fertig ist.");
        var labelCorners = LabelCornersJson.FromDto(corners);
        var front = await images.GetAsync(draft.FrontImageId, ct);
        var preview = images.AddGenerated(extractor.Extract(front.Data, labelCorners), LabelImageFormat.ContentType, user.UserId);

        await images.RemoveAsync([draft.LabelPreviewImageId], ct);
        draft.LabelPreviewImageId = preview.Id;
        draft.LabelCornersJson = LabelCornersJson.Serialize(labelCorners);
        draft.Touch();
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>
    /// Takes over a finished draft: either it belongs to the wine just created from the form (the extracted label
    /// becomes its label image, the front photo its original), or its bottles are added to an existing wine.
    /// The draft is deleted afterwards.
    /// </summary>
    public async Task<WineDto> AcceptAsync(Guid id, AcceptCaptureRequest request, CancellationToken ct = default)
    {
        var draft = await FindAsync(id, ct);
        if (draft.Status != CaptureStatus.Ready)
            throw new ConflictException("Nur fertig recherchierte Entwürfe können übernommen werden.");
        if ((request.WineId is null) == (request.AddToWineId is null))
            throw new DomainException("Bitte entweder den neuen Wein oder den Wein angeben, zu dem Flaschen hinzukommen.");

        var wine = await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .FirstOrDefaultAsync(w => w.Id == (request.WineId ?? request.AddToWineId) && w.OwnerId == user.UserId, ct)
            ?? throw new NotFoundException("Wein nicht gefunden.");

        if (request.AddToWineId is not null) wine.AddBottles(request.Count ?? draft.BottleCount);

        var keep = new HashSet<Guid>();
        // New wine, or an existing wine without a picture: the draft's photos become its label image.
        if (request.WineId is not null || (wine.LabelImageId is null && wine.LabelSourceImageId is null))
        {
            await images.RemoveAsync([wine.LabelImageId, wine.LabelSourceImageId], ct);
            wine.LabelSourceImageId = draft.FrontImageId;
            wine.LabelImageId = draft.LabelPreviewImageId; // null when the corners were never confirmed
            wine.LabelCornersJson = draft.LabelPreviewImageId is null ? null : draft.LabelCornersJson;
            keep.Add(draft.FrontImageId);
            if (draft.LabelPreviewImageId is { } previewId) keep.Add(previewId);
        }

        var drop = new[] { draft.FrontImageId, draft.BackImageId, draft.LabelPreviewImageId }
            .Where(i => i is not null && !keep.Contains(i.Value));
        await images.RemoveAsync(drop, ct);
        db.CaptureDrafts.Remove(draft);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Deletes the draft with its photos in any state; a running research result is thrown away.</summary>
    public async Task DiscardAsync(Guid id, CancellationToken ct = default)
    {
        var draft = await FindAsync(id, ct);
        await images.RemoveAsync([draft.FrontImageId, draft.BackImageId, draft.LabelPreviewImageId], ct);
        db.CaptureDrafts.Remove(draft);
        await db.SaveChangesAsync(ct);
    }

    // ----- helpers -----

    private void EnsureEnabled()
    {
        if (!availability.IsEnabled)
            throw new ServiceUnavailableException(
                "Die Foto-Erfassung ist nicht verfügbar: Auf dem Server ist kein Schlüssel für den KI-Dienst eingerichtet.");
    }

    private DateOnly Today() => DateOnly.FromDateTime(time.GetLocalNow().DateTime);

    /// <summary>Counts one research for today and saves the pending changes in the same transaction.</summary>
    private async Task ConsumeQuotaAndSaveAsync(CancellationToken ct)
    {
        var today = Today();
        for (var attempt = 0; ; attempt++)
        {
            var usage = await db.CaptureUsages.FirstOrDefaultAsync(u => u.OwnerId == user.UserId && u.Day == today, ct);
            if (usage is null)
            {
                usage = new CaptureUsage { OwnerId = user.UserId, Day = today };
                db.CaptureUsages.Add(usage);
            }
            if (usage.Count >= Limit)
            {
                if (db.CaptureUsages.Entry(usage).State == EntityState.Added) db.CaptureUsages.Remove(usage);
                throw new QuotaExceededException(
                    $"Das Tageslimit von {Limit} Recherchen ist erreicht. Morgen geht es wieder.");
            }
            usage.Count++;
            try
            {
                await db.SaveChangesAsync(ct);
                return;
            }
            catch (DbUpdateException) when (attempt < 2)
            {
                // Another request counted at the same time (concurrency token or new row): reload and try again.
                if (db.CaptureUsages.Entry(usage).State == EntityState.Added) db.CaptureUsages.Remove(usage);
                else await db.CaptureUsages.Entry(usage).ReloadAsync(ct);
            }
        }
    }

    private async Task<CaptureDraft> FindAsync(Guid id, CancellationToken ct) =>
        await db.CaptureDrafts.FirstOrDefaultAsync(d => d.Id == id && d.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Entwurf nicht gefunden.");

    /// <summary>Same barcode, or same name, producer and vintage (case-insensitive).</summary>
    private async Task<Wine?> FindExistingWineAsync(WineResearchResult result, CancellationToken ct)
    {
        var wines = db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .Where(w => w.OwnerId == user.UserId);

        if (BarcodeNormalizer.TryNormalize(result.Barcode?.Value) is { } code &&
            await wines.FirstOrDefaultAsync(w => w.Barcode == code, ct) is { } byBarcode)
            return byBarcode;

        if (result.Name?.Value is not { } name) return null;
        var lowerName = name.Trim().ToLower();
        var lowerProducer = result.Producer?.Value.Trim().ToLower();
        var vintage = result.Vintage?.Value;
        return await wines.FirstOrDefaultAsync(w =>
            w.Name.ToLower() == lowerName &&
            (lowerProducer == null ? w.Producer == null : w.Producer != null && w.Producer.ToLower() == lowerProducer) &&
            w.Vintage == vintage, ct);
    }

    internal static WineResearchResult? ReadResult(string? json) =>
        string.IsNullOrEmpty(json) ? null : JsonSerializer.Deserialize<WineResearchResult>(json, LabelCornersJson.Options);

    private static IEnumerable<FieldSource> FieldsOf(WineResearchResult r) =>
        new FieldSource?[]
            {
                r.Name?.Source, r.Producer?.Source, r.Vintage?.Source, r.Type?.Source, r.Country?.Source,
                r.Region?.Source, r.BottleSizeMl?.Source, r.DrinkFrom?.Source, r.DrinkUntil?.Source,
                r.Barcode?.Source, r.Notes?.Source
            }
            .OfType<FieldSource>()
            .Concat(r.Grapes.Select(g => g.Source));

    private static FieldDto<T>? F<T>(Researched<T>? value) => value is null ? null : new FieldDto<T>(value.Value, value.Source);

    private static CaptureSummaryDto ToSummary(CaptureDraft d, WineResearchResult? r) => new(
        d.Id, d.Status, d.FrontImageId, d.LabelPreviewImageId, r?.Name?.Value, r?.Vintage?.Value, d.BottleCount,
        d.Error, d.CreatedAt);
}
