using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using WineCellar.Application;
using WineCellar.Domain;

namespace WineCellar.Infrastructure;

/// <summary>
/// Barcode lookup via Open Food Facts (free, no API key). Coverage for wines is
/// incomplete, so callers must always allow manual entry.
/// </summary>
public sealed partial class OpenFoodFactsBarcodeLookup(HttpClient http, ILogger<OpenFoodFactsBarcodeLookup> logger)
    : IBarcodeLookup
{
    public async Task<WineDraft?> LookupAsync(string barcode, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"api/v2/product/{Uri.EscapeDataString(barcode)}.json" +
                      "?fields=product_name,brands,quantity,categories_tags,countries_tags";
            using var response = await http.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode) return null; // 404 = unknown product

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            return Parse(doc.RootElement);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            if (cancellationToken.IsCancellationRequested) throw;
            logger.LogWarning(ex, "Barcode lookup for {Barcode} failed", barcode);
            return null;
        }
    }

    public static WineDraft? Parse(JsonElement root)
    {
        if (!root.TryGetProperty("product", out var product) || product.ValueKind != JsonValueKind.Object)
            return null;

        var name = GetString(product, "product_name");
        if (string.IsNullOrWhiteSpace(name)) return null;

        var producer = GetString(product, "brands")?.Split(',')[0].Trim();
        var categories = string.Join(' ', GetStringArray(product, "categories_tags")).ToLowerInvariant();

        return new WineDraft(
            Name: name.Trim(),
            Producer: string.IsNullOrWhiteSpace(producer) ? null : producer,
            Vintage: ParseVintage(name),
            Type: GuessType(categories),
            Country: ParseCountry(GetStringArray(product, "countries_tags").FirstOrDefault()),
            BottleSizeMl: ParseBottleSizeMl(GetString(product, "quantity")));
    }

    public static int? ParseBottleSizeMl(string? quantity)
    {
        if (string.IsNullOrWhiteSpace(quantity)) return null;
        var match = QuantityRegex().Match(quantity);
        if (!match.Success) return null;

        var value = double.Parse(match.Groups[1].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
        var ml = match.Groups[2].Value.ToLowerInvariant() switch
        {
            "ml" => value,
            "cl" => value * 10,
            _ => value * 1000
        };
        return (int)Math.Round(ml);
    }

    public static int? ParseVintage(string name)
    {
        var match = VintageRegex().Match(name);
        return match.Success ? int.Parse(match.Value, CultureInfo.InvariantCulture) : null;
    }

    private static WineType? GuessType(string categories)
    {
        if (categories.Length == 0) return null;
        if (ContainsAny(categories, "sparkling", "champagne", "sekt", "prosecco", "cava", "cremant")) return WineType.Sparkling;
        if (ContainsAny(categories, "rose-wine", "rosé", "rose")) return WineType.Rose;
        if (ContainsAny(categories, "red-wine")) return WineType.Red;
        if (ContainsAny(categories, "white-wine")) return WineType.White;
        if (ContainsAny(categories, "dessert", "sweet-wine")) return WineType.Dessert;
        return null;
    }

    private static bool ContainsAny(string text, params string[] needles) => needles.Any(text.Contains);

    private static string? ParseCountry(string? tag)
    {
        if (string.IsNullOrWhiteSpace(tag)) return null;
        var name = tag[(tag.IndexOf(':') + 1)..].Replace('-', ' ');
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name);
    }

    private static string? GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static IEnumerable<string> GetStringArray(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array)
            yield break;
        foreach (var item in value.EnumerateArray())
            if (item.ValueKind == JsonValueKind.String && item.GetString() is { } s)
                yield return s;
    }

    [GeneratedRegex(@"(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b", RegexOptions.IgnoreCase)]
    private static partial Regex QuantityRegex();

    [GeneratedRegex(@"\b(19|20)\d{2}\b")]
    private static partial Regex VintageRegex();
}
