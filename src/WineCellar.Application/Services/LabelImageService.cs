using Microsoft.EntityFrameworkCore;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// The label image of a wine: only the label, cut out of an original photo with four corners and stored in the
/// standard portrait format. The original photo is kept (privately) so the cut can be adjusted later.
/// Nothing here triggers a research or counts towards the daily limit.
/// </summary>
public class LabelImageService(IAppDbContext db, ICurrentUser user, ImageService images, ILabelImageExtractor extractor)
{
    /// <summary>Sets or replaces the label image from a new photo and the corners chosen in the editor.</summary>
    public async Task<WineDto> SetAsync(Guid wineId, byte[] photo, IReadOnlyList<LabelPointDto>? corners, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        var labelCorners = LabelCornersJson.FromDto(corners);
        var source = images.Add(photo);
        var label = images.AddGenerated(extractor.Extract(photo, labelCorners), LabelImageFormat.ContentType, user.UserId);

        await images.RemoveAsync([wine.LabelImageId, wine.LabelSourceImageId], ct);
        wine.LabelImageId = label.Id;
        wine.LabelSourceImageId = source.Id;
        wine.LabelCornersJson = LabelCornersJson.Serialize(labelCorners);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Cuts the label again from the stored original photo with adjusted corners.</summary>
    public async Task<WineDto> SetCornersAsync(Guid wineId, IReadOnlyList<LabelPointDto>? corners, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        if (wine.LabelSourceImageId is not { } sourceId)
            throw new DomainException("Für diesen Wein ist kein Originalfoto gespeichert. Bitte ein neues Foto wählen.");
        var labelCorners = LabelCornersJson.FromDto(corners);
        var source = await images.GetAsync(sourceId, ct);
        var label = images.AddGenerated(extractor.Extract(source.Data, labelCorners), LabelImageFormat.ContentType, user.UserId);

        await images.RemoveAsync([wine.LabelImageId], ct);
        wine.LabelImageId = label.Id;
        wine.LabelCornersJson = LabelCornersJson.Serialize(labelCorners);
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    /// <summary>Removes the label image together with its original photo.</summary>
    public async Task<WineDto> RemoveAsync(Guid wineId, CancellationToken ct = default)
    {
        var wine = await FindWineAsync(wineId, ct);
        await images.RemoveAsync([wine.LabelImageId, wine.LabelSourceImageId], ct);
        wine.LabelImageId = null;
        wine.LabelSourceImageId = null;
        wine.LabelCornersJson = null;
        await db.SaveChangesAsync(ct);
        return wine.ToDto();
    }

    private async Task<Wine> FindWineAsync(Guid id, CancellationToken ct) =>
        await db.Wines
            .Include(w => w.Country).Include(w => w.Region).Include(w => w.Slots).ThenInclude(s => s.Rack)
            .FirstOrDefaultAsync(w => w.Id == id && w.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Wein nicht gefunden.");
}
