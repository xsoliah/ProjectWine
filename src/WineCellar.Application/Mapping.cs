using System.Text.RegularExpressions;
using WineCellar.Domain;

namespace WineCellar.Application;

internal static class Mapping
{
    public static WineDto ToDto(this Wine w) => new(
        w.Id, w.Barcode, w.Name, w.Producer, w.Vintage, w.Type, w.Country?.ToRef(), w.Region?.ToRef(),
        w.Grapes.OrderBy(g => g.Position).Select(g => new WineGrapeDto(g.GrapeVarietyId, g.GrapeVariety.Name, g.Percent)).ToList(),
        w.IsCuvee,
        w.BottleSizeMl, w.Quantity, w.Slots.ToLocations(), w.Quantity - w.Slots.Count,
        w.DrinkFrom, w.DrinkUntil, w.PurchasePrice, w.Notes,
        w.LabelImageId, w.LabelSourceImageId, Capture.LabelCornersJson.ToDto(w.LabelCornersJson));

    /// <summary>Sorted by rack name, row, column (the order in which bottles are taken out automatically).</summary>
    public static IReadOnlyList<SlotLocationDto> ToLocations(this IEnumerable<RackSlot> slots) => slots
        .OrderBy(s => s.Rack.Name, StringComparer.CurrentCultureIgnoreCase).ThenBy(s => s.Row).ThenBy(s => s.Column)
        .Select(s => new SlotLocationDto(s.Id, s.RackId, s.Rack.Name, s.Row, s.Column))
        .ToList();

    public static RackWineDto ToRackWine(this Wine w) => new(w.Id, w.Name, w.Producer, w.Vintage, w.Type);

    public static OriginRefDto ToRef(this Country c) => new(c.Id, c.Name);

    public static OriginRefDto ToRef(this Region r) => new(r.Id, r.Name);

    public static ArchiveEntryDto ToDto(this ConsumptionRecord r, Wine wine, IReadOnlyList<SlotLocationDto>? freedSlots = null) => new(
        r.Id, r.WineId, wine.Name, wine.Producer, wine.Vintage, wine.Type,
        r.Kind, r.Quantity, r.Date, r.Counterparty, r.Price, r.Rating, r.TastingNote, freedSlots);

    public static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static partial class BarcodeNormalizer
{
    [GeneratedRegex(@"^\d{8}$|^\d{12,14}$")]
    private static partial Regex ValidBarcode();

    /// <summary>Accepts EAN-8, UPC-A, EAN-13 and GTIN-14; ignores spaces and hyphens.</summary>
    public static string Normalize(string? input)
    {
        var cleaned = (input ?? string.Empty).Replace(" ", "").Replace("-", "").Trim();
        if (!ValidBarcode().IsMatch(cleaned))
            throw new DomainException($"Ungültiger Barcode '{input}'. Erwartet werden 8, 12, 13 oder 14 Ziffern (EAN/UPC).");
        return cleaned;
    }

    public static string? NormalizeOrNull(string? input) =>
        string.IsNullOrWhiteSpace(input) ? null : Normalize(input);

    /// <summary>Like <see cref="NormalizeOrNull"/>, but returns null for invalid input instead of throwing.</summary>
    public static string? TryNormalize(string? input)
    {
        try
        {
            return NormalizeOrNull(input);
        }
        catch (DomainException)
        {
            return null;
        }
    }
}
