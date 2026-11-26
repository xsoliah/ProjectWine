using WineCellar.Domain;

namespace WineCellar.Application;

public record WineDto(
    Guid Id,
    string? Barcode,
    string Name,
    string? Producer,
    int? Vintage,
    WineType Type,
    OriginRefDto? Country,
    OriginRefDto? Region,
    IReadOnlyList<WineGrapeDto> Grapes,
    bool IsCuvee,
    int BottleSizeMl,
    int Quantity,
    IReadOnlyList<SlotLocationDto> Slots,
    int UnplacedCount,
    int? DrinkFrom,
    int? DrinkUntil,
    decimal? PurchasePrice,
    string? Notes,
    Guid? LabelImageId = null,
    Guid? LabelSourceImageId = null,
    IReadOnlyList<LabelPointDto>? LabelCorners = null);

/// <summary>Used for create and update (update replaces all fields, including the bottle count).</summary>
public record SaveWineRequest(
    string? Barcode,
    string Name,
    string? Producer = null,
    int? Vintage = null,
    WineType Type = WineType.Red,
    Guid? CountryId = null,
    Guid? RegionId = null,
    IReadOnlyList<WineGrapeRequest>? Grapes = null,
    int BottleSizeMl = 750,
    int Quantity = 1,
    int? DrinkFrom = null,
    int? DrinkUntil = null,
    decimal? PurchasePrice = null,
    string? Notes = null);

public record WineQuery(string? Search = null, WineType? Type = null, bool InCellarOnly = true);

public record AddBottlesRequest(int Count);

public record ConsumeRequest(
    ConsumptionKind Kind,
    int Quantity = 1,
    DateOnly? Date = null,
    string? Counterparty = null,
    decimal? Price = null,
    double? Rating = null,
    string? TastingNote = null);

public record ArchiveEntryDto(
    Guid Id,
    Guid WineId,
    string WineName,
    string? Producer,
    int? Vintage,
    WineType WineType,
    ConsumptionKind Kind,
    int Quantity,
    DateOnly Date,
    string? Counterparty,
    decimal? Price,
    double? Rating,
    string? TastingNote,
    IReadOnlyList<SlotLocationDto>? FreedSlots = null);

/// <summary>PUT replaces these four fields (null clears them).</summary>
public record UpdateArchiveEntryRequest(
    double? Rating,
    string? TastingNote,
    string? Counterparty,
    decimal? Price);

/// <summary>Prefill data for the "add wine" form, coming from an external barcode database.</summary>
public record WineDraft(
    string? Name,
    string? Producer = null,
    int? Vintage = null,
    WineType? Type = null,
    string? Region = null,
    string? Country = null,
    string? Grapes = null,
    int? BottleSizeMl = null);

public enum LookupSource
{
    /// <summary>The user already owns a wine with this barcode.</summary>
    Cellar,
    /// <summary>Found in the external database; use <c>Draft</c> to prefill the form.</summary>
    External,
    /// <summary>Unknown barcode: enter the data manually.</summary>
    None
}

/// <param name="DraftCountryId">Own country whose name matches <c>Draft.Country</c> (case-insensitive), if any.</param>
public record BarcodeLookupResult(
    string Barcode,
    LookupSource Source,
    WineDto? ExistingWine,
    WineDraft? Draft,
    Guid? DraftCountryId = null,
    IReadOnlyList<DraftGrapeDto>? DraftGrapes = null);

// ----- Origins (countries and regions) -----

public record OriginRefDto(Guid Id, string Name);

public record RegionDto(Guid Id, string Name, int WineCount);

/// <summary>A country with its regions (both sorted by name) and how many wines use them (including archived ones).</summary>
public record CountryDto(Guid Id, string Name, int WineCount, IReadOnlyList<RegionDto> Regions);

public record SaveOriginRequest(string Name);

// ----- Statistics -----

public enum StatisticsGrouping
{
    Type,
    Country,
    Region,
    Producer,
    Grape
}

/// <param name="TotalValue">Sum of bottles x purchase price over wines that have a price.</param>
public record StatisticsTotalsDto(int Bottles, int Wines, decimal TotalValue, int WinesWithoutPrice);

/// <param name="Key">Stable id: wine type name, country/region id, normalized producer, "none", "none:{countryId}" or "other".</param>
/// <param name="IsUnknown">"Ohne Angabe" / "Ohne Region" segments.</param>
/// <param name="Children">Only for the "Sonstige" segment: the entries it combines.</param>
public record StatisticsSegmentDto(
    string Key,
    string Label,
    int Bottles,
    int Percent,
    bool IsUnknown = false,
    IReadOnlyList<StatisticsSegmentDto>? Children = null);

/// <param name="Country">Set for the country drill-down (regions of one country).</param>
/// <param name="DrillDown">"cuvee" for the cuvée drill-down (compositions), otherwise null.</param>
public record StatisticsDto(
    StatisticsTotalsDto Totals,
    StatisticsGrouping GroupBy,
    OriginRefDto? Country,
    IReadOnlyList<StatisticsSegmentDto> Segments,
    string? DrillDown = null);

// ----- Grape varieties -----

/// <summary>A grape of a wine, in the wine's order.</summary>
public record WineGrapeDto(Guid Id, string Name, int? Percent);

/// <summary>A grape to store on a wine; the list order is the wine's order.</summary>
public record WineGrapeRequest(Guid GrapeId, int? Percent = null);

/// <summary>A grape suggested by the barcode database, matched to an own variety when the name exists.</summary>
public record DraftGrapeDto(string Name, Guid? GrapeId);

public record GrapeVarietyDto(Guid Id, string Name, int WineCount);

// ----- Wine racks -----

/// <summary>Where one bottle lies: rack, row (1 = top) and column (1 = left).</summary>
public record SlotLocationDto(Guid SlotId, Guid RackId, string RackName, int Row, int Column);

public record RackSummaryDto(Guid Id, string Name, int Height, int Width, int Capacity, int Occupied, int Free);

/// <summary>Short info about the wine in a slot.</summary>
public record RackWineDto(Guid Id, string Name, string? Producer, int? Vintage, WineType Type, Guid? LabelImageId = null);

public record RackSlotDto(Guid Id, int Row, int Column, RackWineDto Wine);

/// <summary>A rack with its occupied slots (free slots are not listed).</summary>
public record RackDto(
    Guid Id,
    string Name,
    int Height,
    int Width,
    int Capacity,
    int Occupied,
    int Free,
    IReadOnlyList<RackSlotDto> Slots);

public record SaveRackRequest(string Name, int Height, int Width);

public record PlaceBottleRequest(Guid WineId, int Row, int Column);

public record MoveBottleRequest(Guid RackId, int Row, int Column);

// ----- Photo capture and label images -----

public record LabelPointDto(double X, double Y);

/// <summary>Four corners, normalized 0..1: top left, top right, bottom right, bottom left.</summary>
public record SetLabelCornersRequest(IReadOnlyList<LabelPointDto> Corners);

public record CaptureQuotaDto(int Limit, int Used, int Remaining, bool Enabled);

public record CaptureCountsDto(int Ready, int Total);

public record CaptureSummaryDto(
    Guid Id,
    CaptureStatus Status,
    Guid FrontImageId,
    Guid? LabelPreviewImageId,
    string? Name,
    int? Vintage,
    int BottleCount,
    string? Error,
    DateTime CreatedAt);

public record FieldDto<T>(T Value, Capture.FieldSource Source);

/// <param name="GrapeId">Own grape variety with this name, if any (otherwise offered for creation).</param>
public record CaptureGrapeDto(string Name, int? Percent, Capture.FieldSource Source, Guid? GrapeId);

public record CaptureDetailDto(
    CaptureSummaryDto Summary,
    Guid? BackImageId,
    string? UserNote,
    IReadOnlyList<LabelPointDto>? LabelCorners,
    bool LabelCornersDetected,
    string? ResearchSummary,
    bool NothingFoundOnWeb,
    FieldDto<string>? Name,
    FieldDto<string>? Producer,
    FieldDto<int>? Vintage,
    FieldDto<WineType>? Type,
    FieldDto<string>? Country,
    FieldDto<string>? Region,
    FieldDto<int>? BottleSizeMl,
    FieldDto<int>? DrinkFrom,
    FieldDto<int>? DrinkUntil,
    FieldDto<string>? Barcode,
    FieldDto<string>? Notes,
    IReadOnlyList<CaptureGrapeDto> Grapes,
    IReadOnlyList<Capture.WebSource> Sources,
    Guid? CountryId,
    Guid? RegionId,
    WineDto? ExistingWine);

/// <summary>Either <c>WineId</c> (the wine just created from the form) or <c>AddToWineId</c> (+ optional count).</summary>
public record AcceptCaptureRequest(Guid? WineId = null, Guid? AddToWineId = null, int? Count = null);
