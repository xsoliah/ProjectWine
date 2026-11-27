using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// The back label photo of a wine: the whole photo, unedited (no cut, no corners). Setting or removing it
/// triggers no research and does not count towards the daily limit.
/// </summary>
public class BackImageService(IAppDbContext db, ICurrentUser user, ImageService images)
{
    /// <summary>Sets or replaces the back image; the previous image is deleted. An invalid file changes nothing.</summary>
    public async Task<WineDto> SetAsync(Guid wineId, byte[] photo, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        var image = images.Add(photo); // validates type and size before anything is touched
        await images.RemoveAsync([wine.BackImageId], ct);
        wine.BackImageId = image.Id;
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    public async Task<WineDto> RemoveAsync(Guid wineId, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        await images.RemoveAsync([wine.BackImageId], ct);
        wine.BackImageId = null;
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    private async Task<Wine> FindWineAsync(Guid id, CancellationToken ct) =>
        await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .FirstOrDefaultAsync(w => w.Id == id && w.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Wein nicht gefunden.");
}
