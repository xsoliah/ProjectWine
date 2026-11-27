using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Application.Capture;
using Microsoft.Extensions.Options;
using WineCellar.Infrastructure.Imaging;
using WineCellar.Domain;
using WineCellar.Infrastructure;

namespace WineCellar.Specs.Support;

/// <summary>
/// Per-scenario test context (injected into step classes by Reqnroll).
/// Uses the real services against an in-memory SQLite database; only the external
/// barcode database and the logged-in user are faked.
/// </summary>
public sealed class TestWorld : IDisposable
{
    private readonly SqliteConnection _connection;

    public AppDbContext Db { get; }
    public FakeCurrentUser User { get; } = new();
    public FakeBarcodeLookup ExternalBarcodes { get; } = new();
    public WineService Wines { get; }
    public ArchiveService Archive { get; }
    public OriginService Origins { get; }
    public GrapeService Grapes { get; }
    public StatisticsService Statistics { get; }
    public RackService Racks { get; }
    public PlacementSuggestionService Suggestions { get; }
    public ImageService Images { get; }
    public LabelImageService LabelImages { get; }
    public BackImageService BackImages { get; }
    public CaptureService Captures { get; }
    public BottleShapeService BottleShapes { get; }
    public DrinkingCurveService DrinkingCurves { get; }
    public BottleAnalyzer Bottles { get; }
    public CaptureProcessor Processor { get; }
    public FakeResearchAgent Agent { get; } = new();
    public FakeCaptureAvailability Availability { get; } = new();
    public FakeCaptureQueue Queue { get; } = new();
    public PhotoCaptureOptions CaptureOptions { get; } = new() { RetryDelays = [TimeSpan.Zero, TimeSpan.Zero] };
    public ILabelImageExtractor Extractor { get; } = new SkiaLabelImageExtractor();

    /// <summary>Drafts by the wine name used in the scenario.</summary>
    public Dictionary<string, Guid> KnownDrafts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public CaptureSummaryDto? LastDraft { get; set; }

    /// <summary>Ids of every country/region created in the scenario (all users), by name - for steps that
    /// deliberately use another user's entries.</summary>
    public Dictionary<string, Guid> KnownCountries { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, Guid> KnownRegions { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, Guid> KnownGrapes { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, Guid> KnownRacks { get; } = new();
    public Dictionary<string, Guid> KnownWines { get; } = new();

    /// <summary>Result of the last drink/sell/gift action (e.g. to check which slots were freed).</summary>
    public ArchiveEntryDto? LastArchiveEntry { get; set; }

    public StatisticsDto? LastStatistics { get; set; }

    /// <summary>Error of the last action (domain rule violated, conflict, not found).</summary>
    public Exception? LastError { get; private set; }
    public BarcodeLookupResult? LastLookup { get; set; }

    public TestWorld()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();

        Wines = new WineService(Db, User, ExternalBarcodes, TimeProvider.System);
        Archive = new ArchiveService(Db, User);
        Origins = new OriginService(Db, User);
        Grapes = new GrapeService(Db, User);
        Statistics = new StatisticsService(Db, User);
        Racks = new RackService(Db, User, TimeProvider.System);
        Suggestions = new PlacementSuggestionService(Db, User);
        Images = new ImageService(Db, User);
        LabelImages = new LabelImageService(Db, User, Images, Extractor);
        BackImages = new BackImageService(Db, User, Images, Extractor);
        var captureOptions = Options.Create(CaptureOptions);
        Bottles = new BottleAnalyzer(new SkiaBottleImageExtractor());
        Captures = new CaptureService(Db, User, Images, Extractor, Bottles, Availability, Queue, captureOptions, TimeProvider.System);
        BottleShapes = new BottleShapeService(Db, User, Images, Bottles, Agent, Captures);
        DrinkingCurves = new DrinkingCurveService(Db, User, Agent, Captures, TimeProvider.System);
        Processor = new CaptureProcessor(Db, Agent, Extractor, Bottles, captureOptions, TimeProvider.System);
    }

    public async Task LoginAsync(string name)
    {
        if (!await Db.Users.AnyAsync(u => u.Id == name))
        {
            Db.Users.Add(new AppUser { Id = name, UserName = name, NormalizedUserName = name.ToUpperInvariant() });
            await Db.SaveChangesAsync();
        }
        User.UserId = name;
    }

    /// <summary>Runs a "When" action and remembers expected business errors instead of failing the step.</summary>
    public async Task TryAsync(Func<Task> action)
    {
        LastError = null;
        try
        {
            await action();
        }
        catch (Exception ex) when (ex is DomainException or NotFoundException or ConflictException or QuotaExceededException or ServiceUnavailableException)
        {
            LastError = ex;
        }
    }

    public async Task<WineDto> SeedWineAsync(string name, int quantity, string? barcode = null)
    {
        var wine = await Wines.CreateAsync(new SaveWineRequest(Barcode: barcode, Name: name, Quantity: quantity));
        KnownWines[name] = wine.Id;
        return wine;
    }

    public async Task<WineDto> FindWineAsync(string name)
    {
        var all = await Wines.ListAsync(new WineQuery(InCellarOnly: false));
        return all.Single(w => w.Name == name);
    }

    public async Task<ArchiveEntryDto> FindArchiveEntryAsync(string wineName)
    {
        var all = await Archive.ListAsync();
        return all.Single(e => e.WineName == wineName);
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }
}

public sealed class FakeCurrentUser : ICurrentUser
{
    public string UserId { get; set; } = "nobody";
}

public sealed class FakeBarcodeLookup : IBarcodeLookup
{
    private readonly Dictionary<string, WineDraft> _known = new();

    public void Add(string barcode, WineDraft draft) => _known[barcode] = draft;

    public Task<WineDraft?> LookupAsync(string barcode, CancellationToken cancellationToken) =>
        Task.FromResult(_known.GetValueOrDefault(barcode));
}
