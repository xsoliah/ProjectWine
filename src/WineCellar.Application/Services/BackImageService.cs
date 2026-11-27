using Microsoft.EntityFrameworkCore;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// The back label image of a wine: only the label, cut out of an original photo with four corners and stored in the
/// standard portrait format (like the front label). The original photo is kept (privately) so the cut can be adjusted.
/// A wine may still carry an unedited photo as back image (no original): it serves as the original for the first cut.
/// Setting, cutting or removing it triggers no research and does not count towards the daily limit.
/// </summary>
public class BackImageService(IAppDbContext db, ICurrentUser user, ImageService images, ILabelImageExtractor extractor)
{
    /// <summary>Sets or replaces the back image from a new photo and the confirmed corners; the previous images are deleted.</summary>
    public async Task<WineDto> SetAsync(Guid wineId, byte[] photo, IReadOnlyList<LabelPointDto>? corners, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        var backCorners = LabelCornersJson.FromDto(corners);
        var source = images.Add(photo); // validates type and size before anything is touched
        var back = images.AddGenerated(extractor.Extract(photo, backCorners), LabelImageFormat.ContentType, user.UserId);

        await images.RemoveAsync([wine.BackImageId, wine.BackSourceImageId], ct);
        wine.BackImageId = back.Id;
        wine.BackSourceImageId = source.Id;
        wine.BackCornersJson = LabelCornersJson.Serialize(backCorners);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Cuts the back label again from the original photo (or from the unedited back photo) with adjusted corners.</summary>
    public async Task<WineDto> SetCornersAsync(Guid wineId, IReadOnlyList<LabelPointDto>? corners, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        var sourceId = wine.BackSourceImageId ?? wine.BackImageId
            ?? throw new DomainException("Für diesen Wein ist keine Rückseite gespeichert. Bitte ein Foto wählen.");
        var backCorners = LabelCornersJson.FromDto(corners);
        var source = await images.GetAsync(sourceId, ct);
        var back = images.AddGenerated(extractor.Extract(source.Data, backCorners), LabelImageFormat.ContentType, user.UserId);

        // With an original the cut image is replaced; an unedited photo is kept and becomes the original.
        if (wine.BackSourceImageId is not null) await images.RemoveAsync([wine.BackImageId], ct);
        wine.BackSourceImageId = sourceId;
        wine.BackImageId = back.Id;
        wine.BackCornersJson = LabelCornersJson.Serialize(backCorners);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Removes the back image together with its original photo.</summary>
    public async Task<WineDto> RemoveAsync(Guid wineId, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        await images.RemoveAsync([wine.BackImageId, wine.BackSourceImageId], ct);
        wine.BackImageId = null;
        wine.BackSourceImageId = null;
        wine.BackCornersJson = null;
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    private async Task<Wine> FindWineAsync(Guid id, CancellationToken ct) =>
        await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .FirstOrDefaultAsync(w => w.Id == id && w.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Wein nicht gefunden.");
}
