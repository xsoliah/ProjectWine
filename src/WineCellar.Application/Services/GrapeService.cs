using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>The user's own list of grape varieties (master data).</summary>
public class GrapeService(IAppDbContext db, ICurrentUser user)
{
    public async Task<IReadOnlyList<GrapeVarietyDto>> ListAsync(CancellationToken ct = default)
    {
        var grapes = await db.GrapeVarieties.AsNoTracking()
            .Where(g => g.OwnerId == user.UserId)
            .ToListAsync(ct);

        // Counts include wines that are only left in the archive: they still reference the grape.
        var usage = await db.WineGrapes
            .Where(wg => wg.GrapeVariety.OwnerId == user.UserId)
            .GroupBy(wg => wg.GrapeVarietyId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        return grapes
            .OrderBy(g => g.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(g => new GrapeVarietyDto(g.Id, g.Name, usage.GetValueOrDefault(g.Id)))
            .ToList();
    }

    public async Task<GrapeVarietyDto> CreateAsync(SaveOriginRequest request, CancellationToken ct = default)
    {
        var grape = new GrapeVariety { OwnerId = user.UserId };
        grape.Rename(request.Name);
        await EnsureNameFreeAsync(grape, exceptId: null, ct);

        db.GrapeVarieties.Add(grape);
        await db.SaveChangesAsync(ct);
        return new GrapeVarietyDto(grape.Id, grape.Name, 0);
    }

    public async Task<GrapeVarietyDto> RenameAsync(Guid id, SaveOriginRequest request, CancellationToken ct = default)
    {
        var grape = await FindAsync(id, ct);
        grape.Rename(request.Name);
        await EnsureNameFreeAsync(grape, exceptId: id, ct);

        await db.SaveChangesAsync(ct);
        return new GrapeVarietyDto(grape.Id, grape.Name, await CountUsageAsync(id, ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var grape = await FindAsync(id, ct);
        var used = await CountUsageAsync(id, ct);
        if (used > 0)
            throw new ConflictException($"Die Rebsorte „{grape.Name}“ wird noch von {used} Wein(en) verwendet.");

        db.GrapeVarieties.Remove(grape);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Every wine with <paramref name="sourceId"/> gets <paramref name="targetId"/> instead. A wine that has
    /// both keeps the target once, at the earlier of the two positions, with the sum of both shares.
    /// </summary>
    public async Task<GrapeVarietyDto> MergeAsync(Guid sourceId, Guid targetId, CancellationToken ct = default)
    {
        if (sourceId == targetId) throw new DomainException("Eine Rebsorte kann nicht mit sich selbst zusammengeführt werden.");
        var source = await FindAsync(sourceId, ct);
        var target = await FindAsync(targetId, ct);

        var wines = await db.Wines
            .Where(w => w.OwnerId == user.UserId && w.Grapes.Any(g => g.GrapeVarietyId == sourceId))
            .ToListAsync(ct);

        foreach (var wine in wines)
        {
            var shares = wine.Grapes.OrderBy(g => g.Position).ToList();
            var fromSource = shares.First(g => g.GrapeVarietyId == sourceId);
            var fromTarget = shares.FirstOrDefault(g => g.GrapeVarietyId == targetId);

            int? percent = fromTarget is null
                ? fromSource.Percent
                : fromSource.Percent is null && fromTarget.Percent is null
                    ? null
                    : Math.Min(100, (fromSource.Percent ?? 0) + (fromTarget.Percent ?? 0));
            var position = fromTarget is null ? fromSource.Position : Math.Min(fromSource.Position, fromTarget.Position);

            var merged = shares
                .Where(g => g.GrapeVarietyId != sourceId && g.GrapeVarietyId != targetId)
                .Select(g => (g.Position, Share: new GrapeShare(g.GrapeVarietyId, g.Percent)))
                .Append((Position: position, Share: new GrapeShare(targetId, percent)))
                .OrderBy(x => x.Position)
                .Select(x => x.Share)
                .ToList();

            // Shares of old data could exceed 100 together; cap the merged entry so the wine stays valid.
            var others = merged.Where(m => m.GrapeVarietyId != targetId).Sum(m => m.Percent ?? 0);
            merged = merged
                .Select(m => m.GrapeVarietyId == targetId && m.Percent is { } p && p + others > 100
                    ? m with { Percent = Math.Max(1, 100 - others) }
                    : m)
                .ToList();

            wine.SetGrapes(merged);
        }

        db.GrapeVarieties.Remove(source);
        await db.SaveChangesAsync(ct);
        return new GrapeVarietyDto(target.Id, target.Name, await CountUsageAsync(targetId, ct));
    }

    private Task<int> CountUsageAsync(Guid id, CancellationToken ct) =>
        db.WineGrapes.CountAsync(wg => wg.GrapeVarietyId == id, ct);

    private async Task<GrapeVariety> FindAsync(Guid id, CancellationToken ct) =>
        await db.GrapeVarieties.FirstOrDefaultAsync(g => g.Id == id && g.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Rebsorte nicht gefunden.");

    private async Task EnsureNameFreeAsync(GrapeVariety grape, Guid? exceptId, CancellationToken ct)
    {
        var taken = await db.GrapeVarieties.AnyAsync(
            g => g.OwnerId == user.UserId && g.NormalizedName == grape.NormalizedName && g.Id != exceptId, ct);
        if (taken) throw new ConflictException($"Die Rebsorte „{grape.Name}“ gibt es bereits.");
    }
}
