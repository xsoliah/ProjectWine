using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WineCellar.Application;
using WineCellar.Domain;

namespace WineCellar.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options), IAppDbContext
{
    public DbSet<Wine> Wines => Set<Wine>();
    public DbSet<ConsumptionRecord> ConsumptionRecords => Set<ConsumptionRecord>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<GrapeVariety> GrapeVarieties => Set<GrapeVariety>();
    public DbSet<WineGrape> WineGrapes => Set<WineGrape>();
    public DbSet<Rack> Racks => Set<Rack>();
    public DbSet<RackSlot> RackSlots => Set<RackSlot>();
    public DbSet<StoredImage> StoredImages => Set<StoredImage>();
    public DbSet<CaptureDraft> CaptureDrafts => Set<CaptureDraft>();
    public DbSet<CaptureUsage> CaptureUsages => Set<CaptureUsage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Wine>(e =>
        {
            e.ToTable("wines");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Barcode).HasMaxLength(14);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.Producer).HasMaxLength(200);
            e.Property(x => x.Notes).HasMaxLength(4000);
            // Label image and original photo: plain ids without FK. A FK to stored_images would give SQL Server a second
            // cascade path from the user (user -> image and user -> wine); the services delete the images themselves.
            e.HasIndex(x => x.LabelImageId);
            e.Property(x => x.LabelCornersJson).HasMaxLength(1000);
            e.Property(x => x.Quantity);
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PurchasePrice).HasPrecision(10, 2);

            // A barcode identifies one wine per user. SQL Server treats NULLs as equal in unique
            // indexes, so wines without a barcode must be excluded via a filter.
            e.HasIndex(x => new { x.OwnerId, x.Barcode }).IsUnique().HasFilter("[Barcode] IS NOT NULL");
            e.HasIndex(x => new { x.OwnerId, x.Name });

            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
            // Origin: deleting a used country/region is refused (Restrict). That a wine's region belongs
            // to the wine's country is checked by WineService.
            e.HasOne(x => x.Country).WithMany().HasForeignKey(x => x.CountryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Region).WithMany().HasForeignKey(x => x.RegionId).OnDelete(DeleteBehavior.Restrict);

            e.HasMany(x => x.Grapes).WithOne().HasForeignKey(g => g.WineId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Grapes).AutoInclude();

            e.HasMany(x => x.Records).WithOne(r => r.Wine).HasForeignKey(r => r.WineId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Country>(e =>
        {
            e.ToTable("countries");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Name).IsRequired().HasMaxLength(Country.MaxNameLength);
            e.Property(x => x.NormalizedName).IsRequired().HasMaxLength(Country.MaxNameLength);
            e.HasIndex(x => new { x.OwnerId, x.NormalizedName }).IsUnique();
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Regions).WithOne(r => r.Country).HasForeignKey(r => r.CountryId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<GrapeVariety>(e =>
        {
            e.ToTable("grape_varieties");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Name).IsRequired().HasMaxLength(GrapeVariety.MaxNameLength);
            e.Property(x => x.NormalizedName).IsRequired().HasMaxLength(GrapeVariety.MaxNameLength);
            e.HasIndex(x => new { x.OwnerId, x.NormalizedName }).IsUnique();
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<WineGrape>(e =>
        {
            e.ToTable("wine_grapes");
            // One entry per wine and variety: the same grape cannot appear twice in a wine.
            e.HasKey(x => new { x.WineId, x.GrapeVarietyId });
            e.HasOne(x => x.GrapeVariety).WithMany().HasForeignKey(x => x.GrapeVarietyId).OnDelete(DeleteBehavior.Restrict);
            e.Navigation(x => x.GrapeVariety).AutoInclude();
        });

        builder.Entity<Region>(e =>
        {
            e.ToTable("regions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Name).IsRequired().HasMaxLength(Region.MaxNameLength);
            e.Property(x => x.NormalizedName).IsRequired().HasMaxLength(Region.MaxNameLength);
            e.HasIndex(x => new { x.CountryId, x.NormalizedName }).IsUnique();
        });

        builder.Entity<Rack>(e =>
        {
            e.ToTable("racks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Name).IsRequired().HasMaxLength(Rack.MaxNameLength);
            e.Property(x => x.NormalizedName).IsRequired().HasMaxLength(Rack.MaxNameLength);
            e.Ignore(x => x.Capacity);
            e.HasIndex(x => new { x.OwnerId, x.NormalizedName }).IsUnique();
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
            // Deleting a rack frees its slots; the wines stay (their bottles are then not placed).
            // ClientCascade: slots are removed by EF (RackService loads them). A database cascade would give
            // SQL Server two cascade paths to rack_slots (user -> wine -> slot and user -> rack -> slot).
            e.HasMany(x => x.Slots).WithOne(s => s.Rack).HasForeignKey(s => s.RackId).OnDelete(DeleteBehavior.ClientCascade);
        });

        builder.Entity<RackSlot>(e =>
        {
            e.ToTable("rack_slots");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            // One bottle per slot, guaranteed by the database (also for concurrent requests).
            e.HasIndex(x => new { x.RackId, x.Row, x.Column }).IsUnique();
            e.HasIndex(x => x.OwnerId);
            // No FK OwnerId -> AppUser: SQL Server refuses multiple cascade paths; slots go with rack or wine.
            e.HasOne(x => x.Wine).WithMany(w => w.Slots).HasForeignKey(x => x.WineId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<StoredImage>(e =>
        {
            e.ToTable("stored_images");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.ContentType).IsRequired().HasMaxLength(50);
            e.Property(x => x.Data).IsRequired();
            e.HasIndex(x => x.OwnerId);
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CaptureDraft>(e =>
        {
            e.ToTable("capture_drafts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.UserNote).HasMaxLength(CaptureDraft.MaxNoteLength);
            e.Property(x => x.Barcode).HasMaxLength(14);
            e.Property(x => x.LabelCornersJson).HasMaxLength(1000);
            e.Property(x => x.Error).HasMaxLength(1000);
            // Optimistic concurrency: claiming (Pending -> Researching) and discarding cannot overlap unnoticed.
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasIndex(x => new { x.OwnerId, x.CreatedAt });
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CaptureUsage>(e =>
        {
            e.ToTable("capture_usage");
            e.HasKey(x => new { x.OwnerId, x.Day });
            e.Property(x => x.OwnerId).HasMaxLength(450);
            e.Property(x => x.Count).IsConcurrencyToken();
            e.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ConsumptionRecord>(e =>
        {
            e.ToTable("consumption_records");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.OwnerId).IsRequired().HasMaxLength(450);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Counterparty).HasMaxLength(200);
            e.Property(x => x.TastingNote).HasMaxLength(4000);
            e.Property(x => x.Price).HasPrecision(10, 2);

            e.HasIndex(x => new { x.OwnerId, x.Date });
        });
    }
}
