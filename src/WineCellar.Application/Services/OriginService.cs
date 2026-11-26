using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>The user's own list of countries and their regions (origin master data).</summary>
public class OriginService(IAppDbContext db, ICurrentUser user)
{
    public async Task<IReadOnlyList<CountryDto>> ListAsync(CancellationToken ct = default)
    {
        var countries = await db.Countries.AsNoTracking()
            .Include(c => c.Regions)
            .Where(c => c.OwnerId == user.UserId)
            .ToListAsync(ct);

        // Counts include wines that are only left in the archive (quantity 0): they still reference the origin.
        var ownWines = db.Wines.Where(w => w.OwnerId == user.UserId);
        var winesPerCountry = await ownWines.Where(w => w.CountryId != null)
            .GroupBy(w => w.CountryId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);
        var winesPerRegion = await ownWines.Where(w => w.RegionId != null)
            .GroupBy(w => w.RegionId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        return countries
            .OrderBy(c => c.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(c => new CountryDto(
                c.Id,
                c.Name,
                winesPerCountry.GetValueOrDefault(c.Id),
                c.Regions
                    .OrderBy(r => r.Name, StringComparer.CurrentCultureIgnoreCase)
                    .Select(r => new RegionDto(r.Id, r.Name, winesPerRegion.GetValueOrDefault(r.Id)))
                    .ToList()))
            .ToList();
    }

    // ----- Countries -----

    public async Task<OriginRefDto> CreateCountryAsync(SaveOriginRequest request, CancellationToken ct = default)
    {
        var country = new Country { OwnerId = user.UserId };
        country.Rename(request.Name);
        await EnsureCountryNameFreeAsync(country.NormalizedName, country.Name, exceptId: null, ct);

        db.Countries.Add(country);
        await db.SaveChangesAsync(ct);
        return new OriginRefDto(country.Id, country.Name);
    }

    public async Task<OriginRefDto> RenameCountryAsync(Guid id, SaveOriginRequest request, CancellationToken ct = default)
    {
        var country = await FindCountryAsync(id, ct);
        country.Rename(request.Name);
        await EnsureCountryNameFreeAsync(country.NormalizedName, country.Name, exceptId: id, ct);

        await db.SaveChangesAsync(ct);
        return new OriginRefDto(country.Id, country.Name);
    }

    /// <summary>Deletes an unused country together with its (then necessarily unused) regions.</summary>
    public async Task DeleteCountryAsync(Guid id, CancellationToken ct = default)
    {
        var country = await FindCountryAsync(id, ct);
        var used = await db.Wines.CountAsync(w => w.OwnerId == user.UserId && w.CountryId == id, ct);
        if (used > 0)
            throw new ConflictException($"Das Land „{country.Name}“ wird noch von {used} Wein(en) verwendet.");

        db.Countries.Remove(country);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Moves everything from <paramref name="sourceId"/> to <paramref name="targetId"/> and deletes the source:
    /// regions with the same name are merged, the others move to the target country.
    /// </summary>
    public async Task<OriginRefDto> MergeCountryAsync(Guid sourceId, Guid targetId, CancellationToken ct = default)
    {
        if (sourceId == targetId) throw new DomainException("Ein Land kann nicht mit sich selbst zusammengeführt werden.");

        var source = await FindCountryAsync(sourceId, ct, withRegions: true);
        var target = await FindCountryAsync(targetId, ct, withRegions: true);

        var wines = await db.Wines
            .Where(w => w.OwnerId == user.UserId && w.CountryId == sourceId)
            .ToListAsync(ct);

        foreach (var region in source.Regions.ToList())
        {
            var twin = target.Regions.FirstOrDefault(r => r.NormalizedName == region.NormalizedName);
            if (twin is null)
            {
                region.CountryId = target.Id;
                region.Country = target;
                continue;
            }

            foreach (var wine in wines.Where(w => w.RegionId == region.Id))
                wine.RegionId = twin.Id;
            db.Regions.Remove(region);
        }

        foreach (var wine in wines)
            wine.CountryId = target.Id;

        db.Countries.Remove(source);
        await db.SaveChangesAsync(ct);
        return new OriginRefDto(target.Id, target.Name);
    }

    // ----- Regions -----

    public async Task<OriginRefDto> CreateRegionAsync(Guid countryId, SaveOriginRequest request, CancellationToken ct = default)
    {
        var country = await FindCountryAsync(countryId, ct);
        var region = new Region { OwnerId = user.UserId, CountryId = country.Id };
        region.Rename(request.Name);
        await EnsureRegionNameFreeAsync(country, region.NormalizedName, region.Name, exceptId: null, ct);

        db.Regions.Add(region);
        await db.SaveChangesAsync(ct);
        return new OriginRefDto(region.Id, region.Name);
    }

    public async Task<OriginRefDto> RenameRegionAsync(Guid id, SaveOriginRequest request, CancellationToken ct = default)
    {
        var region = await FindRegionAsync(id, ct);
        region.Rename(request.Name);
        await EnsureRegionNameFreeAsync(region.Country, region.NormalizedName, region.Name, exceptId: id, ct);

        await db.SaveChangesAsync(ct);
        return new OriginRefDto(region.Id, region.Name);
    }

    public async Task DeleteRegionAsync(Guid id, CancellationToken ct = default)
    {
        var region = await FindRegionAsync(id, ct);
        var used = await db.Wines.CountAsync(w => w.OwnerId == user.UserId && w.RegionId == id, ct);
        if (used > 0)
            throw new ConflictException($"Die Region „{region.Name}“ wird noch von {used} Wein(en) verwendet.");

        db.Regions.Remove(region);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Points all wines of <paramref name="sourceId"/> to <paramref name="targetId"/> (same country) and deletes the source.</summary>
    public async Task<OriginRefDto> MergeRegionAsync(Guid sourceId, Guid targetId, CancellationToken ct = default)
    {
        if (sourceId == targetId) throw new DomainException("Eine Region kann nicht mit sich selbst zusammengeführt werden.");

        var source = await FindRegionAsync(sourceId, ct);
        var target = await FindRegionAsync(targetId, ct);
        if (source.CountryId != target.CountryId)
            throw new DomainException("Regionen können nur innerhalb desselben Landes zusammengeführt werden.");

        var wines = await db.Wines
            .Where(w => w.OwnerId == user.UserId && w.RegionId == sourceId)
            .ToListAsync(ct);
        foreach (var wine in wines)
            wine.RegionId = target.Id;

        db.Regions.Remove(source);
        await db.SaveChangesAsync(ct);
        return new OriginRefDto(target.Id, target.Name);
    }

    // ----- Helpers -----

    private async Task<Country> FindCountryAsync(Guid id, CancellationToken ct, bool withRegions = false)
    {
        var query = withRegions ? db.Countries.Include(c => c.Regions) : db.Countries.AsQueryable();
        return await query.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == user.UserId, ct)
               ?? throw new NotFoundException("Land nicht gefunden.");
    }

    private async Task<Region> FindRegionAsync(Guid id, CancellationToken ct) =>
        await db.Regions.Include(r => r.Country)
            .FirstOrDefaultAsync(r => r.Id == id && r.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Region nicht gefunden.");

    private async Task EnsureCountryNameFreeAsync(string normalized, string name, Guid? exceptId, CancellationToken ct)
    {
        var taken = await db.Countries.AnyAsync(
            c => c.OwnerId == user.UserId && c.NormalizedName == normalized && c.Id != exceptId, ct);
        if (taken) throw new ConflictException($"Das Land „{name}“ gibt es bereits.");
    }

    private async Task EnsureRegionNameFreeAsync(Country country, string normalized, string name, Guid? exceptId, CancellationToken ct)
    {
        var taken = await db.Regions.AnyAsync(
            r => r.CountryId == country.Id && r.NormalizedName == normalized && r.Id != exceptId, ct);
        if (taken) throw new ConflictException($"Die Region „{name}“ gibt es in „{country.Name}“ bereits.");
    }
}
