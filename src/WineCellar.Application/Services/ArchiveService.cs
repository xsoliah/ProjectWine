using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;
using static WineCellar.Application.Mapping;

namespace WineCellar.Application.Services;

/// <summary>The archive of drunk, sold and gifted wines, including ratings.</summary>
public class ArchiveService(IAppDbContext db, ICurrentUser user)
{
    public async Task<IReadOnlyList<ArchiveEntryDto>> ListAsync(ConsumptionKind? kind = null, CancellationToken ct = default)
    {
        var records = db.ConsumptionRecords.AsNoTracking()
            .Include(r => r.Wine)
            .Where(r => r.OwnerId == user.UserId);

        if (kind is { } k) records = records.Where(r => r.Kind == k);

        var result = await records
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return result.Select(r => r.ToDto(r.Wine)).ToList();
    }

    /// <summary>Rate a drunk wine (also later), or correct buyer/recipient and price.</summary>
    public async Task<ArchiveEntryDto> UpdateAsync(Guid id, UpdateArchiveEntryRequest request, CancellationToken ct = default)
    {
        var record = await FindOwnedAsync(id, ct);
        record.UpdateDetails(request.Rating, Clean(request.TastingNote), Clean(request.Counterparty), request.Price);
        await db.SaveChangesAsync(ct);
        return record.ToDto(record.Wine);
    }

    /// <summary>Undo: puts the bottles back into the cellar and removes the archive entry.</summary>
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var record = await FindOwnedAsync(id, ct);
        record.Wine.AddBottles(record.Quantity);
        db.ConsumptionRecords.Remove(record);
        await db.SaveChangesAsync(ct);
    }

    private async Task<ConsumptionRecord> FindOwnedAsync(Guid id, CancellationToken ct) =>
        await db.ConsumptionRecords.Include(r => r.Wine)
            .FirstOrDefaultAsync(r => r.Id == id && r.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Archiveintrag nicht gefunden.");
}
