using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;
using static WineCellar.Application.Mapping;

namespace WineCellar.Application.Services;

public class WineService(
    IAppDbContext db,
    ICurrentUser user,
    IBarcodeLookup barcodeLookup,
    TimeProvider time)
{
    public async Task<IReadOnlyList<WineDto>> ListAsync(WineQuery query, CancellationToken ct = default)
    {
        var wines = WithOrigin(db.Wines.AsNoTracking()).Where(w => w.OwnerId == user.UserId);

        if (query.InCellarOnly) wines = wines.Where(w => w.Quantity > 0);
        if (query.Type is { } type) wines = wines.Where(w => w.Type == type);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            var lower = term.ToLower();
            wines = wines.Where(w =>
                w.Name.ToLower().Contains(lower) ||
                (w.Producer != null && w.Producer.ToLower().Contains(lower)) ||
                (w.Region != null && w.Region.Name.ToLower().Contains(lower)) ||
                (w.Country != null && w.Country.Name.ToLower().Contains(lower)) ||
                w.Grapes.Any(g => g.GrapeVariety.Name.ToLower().Contains(lower)) ||
                w.Barcode == term);
        }

        var result = await wines.OrderBy(w => w.Name).ThenBy(w => w.Vintage).ToListAsync(ct);
        return result.Select(w => w.ToDto()).ToList();
    }

    public async Task<WineDto> GetAsync(Guid id, CancellationToken ct = default) =>
        (await FindOwnedAsync(id, track: false, ct)).ToDto();

    public async Task<WineDto> CreateAsync(SaveWineRequest request, CancellationToken ct = default)
    {
        var barcode = BarcodeNormalizer.NormalizeOrNull(request.Barcode);
        await EnsureBarcodeFreeAsync(barcode, exceptWineId: null, ct);

        var wine = new Wine { OwnerId = user.UserId };
        Apply(wine, request, barcode);
        await ApplyOriginAsync(wine, request.CountryId, request.RegionId, ct);
        await ApplyGrapesAsync(wine, request.Grapes, ct);
        db.Wines.Add(wine);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    public async Task<WineDto> UpdateAsync(Guid id, SaveWineRequest request, CancellationToken ct = default)
    {
        var wine = await FindOwnedAsync(id, track: true, ct);
        var barcode = BarcodeNormalizer.NormalizeOrNull(request.Barcode);
        await EnsureBarcodeFreeAsync(barcode, exceptWineId: id, ct);
        if (request.Quantity < wine.Slots.Count)
            throw new DomainException(
                $"Von „{wine.Name}“ liegen {wine.Slots.Count} Flasche(n) in Regalfächern. " +
                "Bitte zuerst Flaschen aus den Fächern nehmen, bevor du die Anzahl verringerst.");

        Apply(wine, request, barcode);
        await ApplyOriginAsync(wine, request.CountryId, request.RegionId, ct);
        await ApplyGrapesAsync(wine, request.Grapes, ct);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Deletes the wine and, via cascade, its archive entries; also its label image and original photo.</summary>
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var wine = await FindOwnedAsync(id, track: true, ct);
        var imageIds = new[] { wine.LabelImageId, wine.LabelSourceImageId }.OfType<Guid>().ToList();
        db.StoredImages.RemoveRange(await db.StoredImages.Where(i => imageIds.Contains(i.Id)).ToListAsync(ct));
        db.Wines.Remove(wine);
        await db.SaveChangesAsync(ct);
    }

    public async Task<WineDto> AddBottlesAsync(Guid id, int count, CancellationToken ct = default)
    {
        var wine = await FindOwnedAsync(id, track: true, ct);
        wine.AddBottles(count);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>
    /// Takes bottles out of the cellar and writes the archive entry. Bottles that are not placed in a rack
    /// are used first; if they are not enough, slots of this wine are freed (sorted by rack name, row, column)
    /// and returned as <see cref="ArchiveEntryDto.FreedSlots"/>.
    /// </summary>
    public async Task<ArchiveEntryDto> ConsumeAsync(Guid id, ConsumeRequest request, CancellationToken ct = default)
    {
        var wine = await FindOwnedAsync(id, track: true, ct);
        var date = request.Date ?? DateOnly.FromDateTime(time.GetLocalNow().DateTime);
        var unplaced = wine.Quantity - wine.Slots.Count;
        var toFree = Math.Max(0, request.Quantity - unplaced);

        var record = wine.Consume(
            request.Kind,
            request.Quantity,
            date,
            Clean(request.Counterparty),
            request.Price,
            request.Rating,
            Clean(request.TastingNote));

        var freed = wine.Slots.ToLocations().Take(toFree).ToList();
        var freedIds = freed.Select(f => f.SlotId).ToHashSet();
        db.RackSlots.RemoveRange(wine.Slots.Where(s => freedIds.Contains(s.Id)).ToList());

        db.ConsumptionRecords.Add(record);
        await db.SaveChangesAsync(ct);
        return record.ToDto(wine, freed);
    }

    /// <summary>
    /// Barcode scan: first checks the user's own cellar, then the external database.
    /// </summary>
    public async Task<BarcodeLookupResult> LookupBarcodeAsync(string barcode, CancellationToken ct = default)
    {
        var code = BarcodeNormalizer.Normalize(barcode);

        var existing = await WithOrigin(db.Wines.AsNoTracking())
            .FirstOrDefaultAsync(w => w.OwnerId == user.UserId && w.Barcode == code, ct);
        if (existing is not null)
            return new BarcodeLookupResult(code, LookupSource.Cellar, existing.ToDto(), null);

        var draft = await barcodeLookup.LookupAsync(code, ct);
        if (draft is null)
            return new BarcodeLookupResult(code, LookupSource.None, null, null);

        Guid? draftCountryId = null;
        if (!string.IsNullOrWhiteSpace(draft.Country))
        {
            var normalized = OriginName.Normalize(draft.Country);
            draftCountryId = await db.Countries
                .Where(c => c.OwnerId == user.UserId && c.NormalizedName == normalized)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync(ct);
        }
        IReadOnlyList<DraftGrapeDto>? draftGrapes = null;
        var grapeNames = GrapeText.Split(draft.Grapes);
        if (grapeNames.Count > 0)
        {
            var own = await db.GrapeVarieties.Where(g => g.OwnerId == user.UserId)
                .Select(g => new { g.Id, g.NormalizedName })
                .ToListAsync(ct);
            draftGrapes = grapeNames
                .Select(name => new DraftGrapeDto(name,
                    own.FirstOrDefault(g => g.NormalizedName == OriginName.Normalize(name))?.Id))
                .ToList();
        }
        return new BarcodeLookupResult(code, LookupSource.External, null, draft, draftCountryId, draftGrapes);
    }

    private void Apply(Wine wine, SaveWineRequest r, string? barcode)
    {
        wine.Barcode = barcode;
        wine.Name = r.Name?.Trim() ?? string.Empty;
        wine.Producer = Clean(r.Producer);
        wine.Vintage = r.Vintage;
        wine.Type = r.Type;
        wine.BottleSizeMl = r.BottleSizeMl;
        wine.DrinkFrom = r.DrinkFrom;
        wine.DrinkUntil = r.DrinkUntil;
        wine.PurchasePrice = r.PurchasePrice;
        wine.Notes = Clean(r.Notes);
        wine.SetQuantity(r.Quantity);
        wine.EnsureValid(time.GetUtcNow().Year);
    }

    /// <summary>Country and region are optional, must be the user's own, and the region must belong to the country.</summary>
    private async Task ApplyOriginAsync(Wine wine, Guid? countryId, Guid? regionId, CancellationToken ct)
    {
        if (regionId is not null && countryId is null)
            throw new DomainException("Eine Region kann nur zusammen mit einem Land angegeben werden.");

        Country? country = null;
        if (countryId is { } cid)
        {
            country = await db.Countries.FirstOrDefaultAsync(c => c.Id == cid && c.OwnerId == user.UserId, ct)
                      ?? throw new NotFoundException("Land nicht gefunden.");
        }

        Region? region = null;
        if (regionId is { } rid)
        {
            region = await db.Regions.FirstOrDefaultAsync(r => r.Id == rid && r.OwnerId == user.UserId, ct)
                     ?? throw new NotFoundException("Region nicht gefunden.");
            if (region.CountryId != countryId)
                throw new DomainException($"Die Region „{region.Name}“ gehört nicht zum Land „{country!.Name}“.");
        }

        wine.CountryId = country?.Id;
        wine.Country = country;
        wine.RegionId = region?.Id;
        wine.Region = region;
    }

    /// <summary>All grapes must be the user's own; order and shares are validated by the wine.</summary>
    private async Task ApplyGrapesAsync(Wine wine, IReadOnlyList<WineGrapeRequest>? grapes, CancellationToken ct)
    {
        var requested = grapes ?? [];
        var ids = requested.Select(g => g.GrapeId).Distinct().ToList();
        var own = await db.GrapeVarieties
            .Where(g => g.OwnerId == user.UserId && ids.Contains(g.Id))
            .ToDictionaryAsync(g => g.Id, ct);
        if (own.Count != ids.Count) throw new NotFoundException("Rebsorte nicht gefunden.");

        wine.SetGrapes(requested.Select(g => new GrapeShare(g.GrapeId, g.Percent)).ToList());
        foreach (var entry in wine.Grapes) entry.GrapeVariety = own[entry.GrapeVarietyId];
    }

    private static IQueryable<Wine> WithOrigin(IQueryable<Wine> wines) =>
        wines.Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack);

    private async Task EnsureBarcodeFreeAsync(string? barcode, Guid? exceptWineId, CancellationToken ct)
    {
        if (barcode is null) return;

        var sameBarcode = db.Wines.Where(w => w.OwnerId == user.UserId && w.Barcode == barcode);
        if (exceptWineId is { } own) sameBarcode = sameBarcode.Where(w => w.Id != own);

        if (await sameBarcode.AnyAsync(ct))
            throw new ConflictException(
                $"Ein Wein mit dem Barcode {barcode} ist bereits im Keller. Bitte Flaschen zum vorhandenen Wein hinzufügen.");
    }

    private async Task<Wine> FindOwnedAsync(Guid id, bool track, CancellationToken ct)
    {
        var query = WithOrigin(track ? db.Wines.AsQueryable() : db.Wines.AsNoTracking());
        return await query.FirstOrDefaultAsync(w => w.Id == id && w.OwnerId == user.UserId, ct)
               ?? throw new NotFoundException("Wein nicht gefunden.");
    }
}
