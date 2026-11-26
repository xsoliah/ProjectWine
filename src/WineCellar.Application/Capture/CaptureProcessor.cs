using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WineCellar.Domain;

namespace WineCellar.Application.Capture;

/// <summary>
/// Runs the research of one draft: claims it exclusively, calls the agent (with retries for transient errors and a
/// time limit per attempt), validates the result, cuts the label preview and stores the outcome. Used by the
/// background worker; independent of the logged-in user.
/// </summary>
public class CaptureProcessor(
    IAppDbContext db,
    IWineResearchAgent agent,
    ILabelImageExtractor extractor,
    BottleAnalyzer bottles,
    IOptions<PhotoCaptureOptions> options,
    TimeProvider time,
    ILogger<CaptureProcessor>? logger = null)
{
    public const int MaxNoteLength = 500;
    private readonly ILogger _log = logger ?? NullLogger<CaptureProcessor>.Instance;

    /// <summary>After a restart: drafts that were being researched start again.</summary>
    public async Task<int> ResetInterruptedAsync(CancellationToken ct = default)
    {
        var stuck = await db.CaptureDrafts.Where(d => d.Status == CaptureStatus.Researching).ToListAsync(ct);
        foreach (var draft in stuck)
        {
            draft.Status = CaptureStatus.Pending;
            draft.Touch();
        }
        await db.SaveChangesAsync(ct);
        return stuck.Count;
    }

    /// <summary>Takes the oldest waiting draft (Pending -> Researching); null when there is none.</summary>
    public async Task<Guid?> ClaimNextAsync(CancellationToken ct = default)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var draft = await db.CaptureDrafts
                .Where(d => d.Status == CaptureStatus.Pending)
                .OrderBy(d => d.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (draft is null) return null;

            draft.Status = CaptureStatus.Researching;
            draft.StartedAt = time.GetUtcNow().UtcDateTime;
            draft.Touch();
            try
            {
                await db.SaveChangesAsync(ct);
                return draft.Id;
            }
            catch (DbUpdateConcurrencyException)
            {
                // Someone else claimed or discarded it: forget our copy and look for the next one.
                db.CaptureDrafts.Entry(draft).State = EntityState.Detached;
            }
        }
        return null;
    }

    /// <summary>Researches a claimed draft and stores the result or the failure.</summary>
    public async Task ProcessAsync(Guid draftId, CancellationToken ct = default)
    {
        var draft = await db.CaptureDrafts.FirstOrDefaultAsync(d => d.Id == draftId, ct);
        if (draft is null || draft.Status != CaptureStatus.Researching) return;

        var imageIds = new[] { draft.FrontImageId, draft.BackImageId }.OfType<Guid>().ToList();
        var photos = await db.StoredImages.AsNoTracking().Where(i => imageIds.Contains(i.Id)).ToListAsync(ct);
        var front = photos.FirstOrDefault(p => p.Id == draft.FrontImageId);
        if (front is null)
        {
            await FinishAsync(draft, failed: "Das Foto des Entwurfs ist nicht mehr vorhanden.", ct);
            return;
        }
        var research = new List<ResearchImage> { new(front.Data, front.ContentType) };
        if (photos.FirstOrDefault(p => p.Id == draft.BackImageId) is { } back) research.Add(new(back.Data, back.ContentType));

        WineResearchResult? result = null;
        string? error = null;
        var delays = options.Value.RetryDelays;
        for (var attempt = 0; ; attempt++)
        {
            draft.Attempts++;
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(options.Value.AttemptTimeout);
            try
            {
                result = await agent.ResearchAsync(research, draft.UserNote, draft.Barcode, timeout.Token);
                break;
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                error = "Die Recherche hat zu lange gedauert (Zeitlimit 5 Minuten).";
                if (attempt >= delays.Length) break;
            }
            catch (WineResearchException ex) when (ex.IsTransient)
            {
                error = ex.Message;
                if (attempt >= delays.Length) break;
            }
            catch (WineResearchException ex)
            {
                error = ex.Message;
                break;
            }
            _log.LogWarning("Research of draft {DraftId} failed (attempt {Attempt}): {Error}; retrying", draftId, attempt + 1, error);
            await Task.Delay(delays[attempt], time, ct);
        }

        if (result is null)
        {
            await FinishAsync(draft, failed: error ?? "Die Recherche ist fehlgeschlagen.", ct);
            return;
        }
        if (!result.IsWineLabel)
        {
            await FinishAsync(draft, failed: "Auf dem Foto wurde kein Weinetikett erkannt.", ct);
            return;
        }

        var clean = Sanitize(result, time.GetUtcNow().Year);
        // A barcode from the user's device beats whatever the agent read or found.
        if (draft.Barcode is { } ownBarcode) clean = clean with { Barcode = new Researched<string>(ownBarcode, FieldSource.Label) };
        draft.ResultJson = JsonSerializer.Serialize(clean with { Sources = [], LabelCorners = null, Bottle = null }, LabelCornersJson.Options);
        draft.SourcesJson = JsonSerializer.Serialize(clean.Sources, LabelCornersJson.Options);
        if (clean.LabelCorners is { } corners)
        {
            try
            {
                var preview = new StoredImage
                {
                    OwnerId = draft.OwnerId,
                    ContentType = LabelImageFormat.ContentType,
                    Data = extractor.Extract(front.Data, corners)
                };
                db.StoredImages.Add(preview);
                draft.LabelPreviewImageId = preview.Id;
                draft.LabelCornersJson = LabelCornersJson.Serialize(corners);
            }
            catch (DomainException ex)
            {
                // Without a preview the user sets the corners in the editor.
                _log.LogWarning(ex, "Label preview for draft {DraftId} could not be created", draftId);
            }
        }
        DetectBottle(draft, front.Data, clean);
        await FinishAsync(draft, failed: null, ct);
    }

    /// <summary>
    /// Bottle measurements and bottle image from what the agent saw. A bottle that is cut off, missing or implausible
    /// becomes a standard bottle flagged "Flasche prüfen" (no bottle image yet). Never fails the research.
    /// </summary>
    private void DetectBottle(CaptureDraft draft, byte[] photo, WineResearchResult clean)
    {
        try
        {
            var analysis = bottles.Analyze(photo, clean.Bottle, clean.LabelCorners, clean.Type?.Value ?? WineType.Red);
            draft.BottleShapeJson = BottleShapeJson.Serialize(analysis.Shape);
            if (analysis.Image is { } png)
            {
                var image = new StoredImage { OwnerId = draft.OwnerId, ContentType = BottleImageFormat.ContentType, Data = png };
                db.StoredImages.Add(image);
                draft.BottleImageId = image.Id;
            }
        }
        catch (DomainException ex)
        {
            _log.LogWarning(ex, "Bottle of draft {DraftId} could not be cut out", draft.Id);
            draft.BottleShapeJson = BottleShapeJson.Serialize(BottleShape.Standard(clean.Type?.Value ?? WineType.Red) with { NeedsReview = true });
        }
    }

    private async Task FinishAsync(CaptureDraft draft, string? failed, CancellationToken ct)
    {
        draft.Status = failed is null ? CaptureStatus.Ready : CaptureStatus.Failed;
        draft.Error = failed;
        draft.CompletedAt = time.GetUtcNow().UtcDateTime;
        draft.Touch();
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Discarded (or reset) while we were researching: the result is thrown away.
            _log.LogInformation("Draft {DraftId} was discarded during the research; result dropped", draft.Id);
        }
    }

    /// <summary>
    /// Server-side checks of the agent's answer: invalid single values are cleared (not the whole draft), the note is
    /// shortened, implausible label corners are dropped.
    /// </summary>
    public static WineResearchResult Sanitize(WineResearchResult r, int currentYear)
    {
        static Researched<string>? Text(Researched<string>? v, int max) =>
            v is null || string.IsNullOrWhiteSpace(v.Value) ? null : v with { Value = Cut(v.Value.Trim(), max) };
        static Researched<int>? Range(Researched<int>? v, int min, int max) =>
            v is not null && v.Value >= min && v.Value <= max ? v : null;

        var grapes = r.Grapes
            .Where(g => !string.IsNullOrWhiteSpace(g.Name))
            .Select(g => g with { Name = Cut(g.Name.Trim(), GrapeVariety.MaxNameLength), Percent = g.Percent is >= 1 and <= 100 ? g.Percent : null })
            .DistinctBy(g => OriginName.Normalize(g.Name))
            .ToList();
        if (grapes.Sum(g => g.Percent ?? 0) > 100) grapes = grapes.Select(g => g with { Percent = null }).ToList();

        var drinkFrom = Range(r.DrinkFrom, 1800, currentYear + 100);
        var drinkUntil = Range(r.DrinkUntil, 1800, currentYear + 100);
        if (drinkFrom is not null && drinkUntil is not null && drinkUntil.Value < drinkFrom.Value) drinkUntil = null;

        var barcode = r.Barcode is null ? null : BarcodeNormalizer.TryNormalizeChecked(r.Barcode.Value) is { } code ? r.Barcode with { Value = code } : null;

        return r with
        {
            Summary = r.Summary is null ? null : Cut(r.Summary.Trim(), 500),
            Name = Text(r.Name, 200),
            Producer = Text(r.Producer, 200),
            Vintage = Range(r.Vintage, 1800, currentYear + 1),
            Type = r.Type is not null && Enum.IsDefined(r.Type.Value) ? r.Type : null,
            Country = Text(r.Country, Country.MaxNameLength),
            Region = Text(r.Region, Region.MaxNameLength),
            BottleSizeMl = Range(r.BottleSizeMl, 50, 30000),
            DrinkFrom = drinkFrom,
            DrinkUntil = drinkUntil,
            Barcode = barcode,
            Notes = Text(r.Notes, MaxNoteLength),
            Grapes = grapes,
            LabelCorners = r.LabelCorners is { } c && c.IsPlausible() ? c : null,
            Bottle = r.Bottle is { } b && BottleShape.OutlineIsPlausible(b.Outline) ? b : null,
            Sources = r.Sources
                .Where(s => Uri.TryCreate(s.Url, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps))
                .DistinctBy(s => s.Url)
                .ToList()
        };
    }

    private static string Cut(string value, int max) => value.Length <= max ? value : value[..max].TrimEnd();
}
