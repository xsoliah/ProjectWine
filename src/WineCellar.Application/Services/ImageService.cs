using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>Stored photos and label images; every access is limited to the owner.</summary>
public class ImageService(IAppDbContext db, ICurrentUser user)
{
    /// <summary>Validates type (by the first bytes) and size and adds the image to the context (not saved yet).</summary>
    public StoredImage Add(byte[] data, string? ownerId = null)
    {
        if (data.Length == 0) throw new DomainException("Das Bild ist leer.");
        if (data.Length > StoredImage.MaxBytes)
            throw new DomainException("Das Bild ist größer als 10 MB.");

        var image = new StoredImage
        {
            OwnerId = ownerId ?? user.UserId,
            ContentType = DetectContentType(data)
                          ?? throw new DomainException("Nur Bilder im Format JPEG, PNG oder WebP sind erlaubt."),
            Data = data
        };
        db.StoredImages.Add(image);
        return image;
    }

    /// <summary>Adds an image of a known type that the server produced itself (e.g. an extracted label).</summary>
    public StoredImage AddGenerated(byte[] data, string contentType, string ownerId)
    {
        var image = new StoredImage { OwnerId = ownerId, ContentType = contentType, Data = data };
        db.StoredImages.Add(image);
        return image;
    }

    public async Task<StoredImage> GetAsync(Guid id, CancellationToken ct = default) =>
        await db.StoredImages.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id && i.OwnerId == user.UserId, ct)
        ?? throw new NotFoundException("Bild nicht gefunden.");

    /// <summary>Marks the images for deletion (saved with the caller's next SaveChanges). Missing ids are ignored.</summary>
    public async Task RemoveAsync(IEnumerable<Guid?> ids, CancellationToken ct = default)
    {
        var list = ids.Where(id => id is not null).Select(id => id!.Value).Distinct().ToList();
        if (list.Count == 0) return;
        var images = await db.StoredImages.Where(i => list.Contains(i.Id)).ToListAsync(ct);
        db.StoredImages.RemoveRange(images);
    }

    /// <summary>JPEG, PNG or WebP by magic bytes; null for anything else.</summary>
    public static string? DetectContentType(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF) return "image/jpeg";
        if (data.Length >= 8 && data[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return "image/png";
        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        return null;
    }
}
