using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application;

public interface ICurrentUser
{
    /// <summary>Id of the authenticated user. Every query is scoped to it.</summary>
    string UserId { get; }
}

public interface IAppDbContext
{
    DbSet<Wine> Wines { get; }
    DbSet<ConsumptionRecord> ConsumptionRecords { get; }
    DbSet<Country> Countries { get; }
    DbSet<Region> Regions { get; }
    DbSet<GrapeVariety> GrapeVarieties { get; }
    DbSet<WineGrape> WineGrapes { get; }
    DbSet<Rack> Racks { get; }
    DbSet<RackSlot> RackSlots { get; }
    DbSet<StoredImage> StoredImages { get; }
    DbSet<CaptureDraft> CaptureDrafts { get; }
    DbSet<CaptureUsage> CaptureUsages { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>Looks up product data for a barcode in an external database.</summary>
public interface IBarcodeLookup
{
    /// <summary>Returns null when the barcode is unknown or the service is unavailable.</summary>
    Task<WineDraft?> LookupAsync(string barcode, CancellationToken cancellationToken);
}
