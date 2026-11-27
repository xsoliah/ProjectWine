using System.Text.Json;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Infrastructure.Research;

/// <summary>
/// Turns the content blocks of Claude's answer (as raw JSON, so it can be tested with recorded responses) into a
/// <see cref="WineResearchResult"/>: the structured JSON from the last text block, the sources from the web
/// search / web fetch result blocks (without duplicates).
/// </summary>
public static class ResearchResponseReader
{
    public static WineResearchResult Read(string stopReason, IEnumerable<JsonElement> blocks)
    {
        var list = blocks.ToList();

        // Check the stop reason before reading any content.
        switch (stopReason)
        {
            case "refusal":
                throw new WineResearchException(
                    "Der KI-Dienst hat die Auswertung dieses Fotos abgelehnt. Bitte ein anderes Foto versuchen.", isTransient: false);
            case "max_tokens":
                throw new WineResearchException("Die Antwort des KI-Dienstes war unvollständig.", isTransient: true);
            case "pause_turn":
                throw new WineResearchException("Die Recherche wurde nach mehreren Fortsetzungen abgebrochen.", isTransient: false);
        }

        var text = list.Where(b => TypeOf(b) == "text")
            .Select(b => b.TryGetProperty("text", out var t) ? t.GetString() : null)
            .LastOrDefault(t => !string.IsNullOrWhiteSpace(t));
        if (text is null)
            throw new WineResearchException("Der KI-Dienst hat keine verwertbare Antwort geliefert.", isTransient: false);

        JsonElement root;
        try
        {
            // Without strict output the model may wrap the JSON in a code fence or a sentence: take the outer object.
            var start = text.IndexOf('{');
            var end = text.LastIndexOf('}');
            if (start < 0 || end <= start) throw new JsonException("no JSON object");
            root = JsonDocument.Parse(text[start..(end + 1)]).RootElement;
        }
        catch (JsonException ex)
        {
            throw new WineResearchException("Die Antwort des KI-Dienstes war kein gültiges JSON.", isTransient: false, ex);
        }

        return new WineResearchResult
        {
            IsWineLabel = !root.TryGetProperty("isWineLabel", out var isLabel) || isLabel.ValueKind != JsonValueKind.False,
            Summary = Str(root, "summary"),
            Name = Field(root, "name", e => e.GetString()!),
            Producer = Field(root, "producer", e => e.GetString()!),
            Vintage = Field(root, "vintage", e => e.GetInt32()),
            Type = Field(root, "type", e => Enum.Parse<WineType>(e.GetString()!, ignoreCase: true)),
            Country = Field(root, "country", e => e.GetString()!),
            Region = Field(root, "region", e => e.GetString()!),
            BottleSizeMl = Field(root, "bottleSizeMl", e => e.GetInt32()),
            DrinkFrom = Field(root, "drinkFrom", e => e.GetInt32()),
            DrinkUntil = Field(root, "drinkUntil", e => e.GetInt32()),
            DrinkPeak = Field(root, "drinkPeak", e => e.GetInt32()),
            DrinkSpread = Field(root, "drinkSpread", e => e.GetDouble()),
            Barcode = Field(root, "barcode", e => e.ValueKind == JsonValueKind.Number ? e.GetRawText() : e.GetString()!),
            Notes = Field(root, "notes", e => e.GetString()!),
            Grapes = Grapes(root),
            LabelCorners = Corners(root),
            Bottle = Bottle(root),
            Sources = Sources(list),
        };
    }

    /// <summary>Titles and URLs of the web search results and fetched pages, first occurrence wins.</summary>
    public static IReadOnlyList<WebSource> Sources(IEnumerable<JsonElement> blocks)
    {
        var sources = new List<WebSource>();
        foreach (var block in blocks)
        {
            switch (TypeOf(block))
            {
                case "web_search_tool_result" when block.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array:
                    foreach (var r in content.EnumerateArray())
                        if (Str(r, "url") is { } url) sources.Add(new WebSource(Str(r, "title") ?? url, url));
                    break;
                case "web_fetch_tool_result" when block.TryGetProperty("content", out var fetch) && TypeOf(fetch) == "web_fetch_result":
                    if (Str(fetch, "url") is { } fetched)
                    {
                        var title = fetch.TryGetProperty("content", out var doc) ? Str(doc, "title") : null;
                        sources.Add(new WebSource(title ?? fetched, fetched));
                    }
                    break;
            }
        }
        return sources.DistinctBy(s => s.Url).ToList();
    }

    private static Researched<T>? Field<T>(JsonElement root, string name, Func<JsonElement, T> read)
    {
        if (!root.TryGetProperty(name, out var field) || field.ValueKind != JsonValueKind.Object) return null;
        if (!field.TryGetProperty("value", out var value) || value.ValueKind == JsonValueKind.Null) return null;
        try
        {
            return new Researched<T>(read(value), SourceOf(field));
        }
        catch (Exception ex) when (ex is FormatException or InvalidOperationException or ArgumentException)
        {
            return null; // a single unusable value is dropped, not the whole answer
        }
    }

    private static IReadOnlyList<ResearchedGrape> Grapes(JsonElement root)
    {
        if (!root.TryGetProperty("grapes", out var grapes) || grapes.ValueKind != JsonValueKind.Array) return [];
        return grapes.EnumerateArray()
            .Where(g => Str(g, "name") is not null)
            .Select(g => new ResearchedGrape(
                Str(g, "name")!,
                g.TryGetProperty("percent", out var p) && p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var pct) ? pct : null,
                SourceOf(g)))
            .ToList();
    }

    private static LabelCorners? Corners(JsonElement root)
    {
        if (!root.TryGetProperty("labelCorners", out var c) || c.ValueKind != JsonValueKind.Object) return null;
        LabelPoint? P(string name) =>
            c.TryGetProperty(name, out var p) && p.TryGetProperty("x", out var x) && p.TryGetProperty("y", out var y) &&
            x.ValueKind == JsonValueKind.Number && y.ValueKind == JsonValueKind.Number
                ? new LabelPoint(x.GetDouble(), y.GetDouble())
                : null;
        return P("topLeft") is { } tl && P("topRight") is { } tr && P("bottomRight") is { } br && P("bottomLeft") is { } bl
            ? new LabelCorners(tl, tr, br, bl)
            : null;
    }

    /// <summary>
    /// The bottle silhouette: outline points with two numeric coordinates (anything else is dropped) and the completeness
    /// flag. Fewer than <see cref="BottleShape.MinOutlinePoints"/> usable points mean no silhouette; a missing flag means
    /// "not complete" (nothing is assumed).
    /// </summary>
    private static BottleDetection? Bottle(JsonElement root)
    {
        if (!root.TryGetProperty("bottle", out var b) || b.ValueKind != JsonValueKind.Object) return null;
        if (!b.TryGetProperty("outline", out var outline) || outline.ValueKind != JsonValueKind.Array) return null;
        var points = outline.EnumerateArray()
            .Where(p => p.ValueKind == JsonValueKind.Object
                        && p.TryGetProperty("x", out var x) && x.ValueKind == JsonValueKind.Number
                        && p.TryGetProperty("y", out var y) && y.ValueKind == JsonValueKind.Number)
            .Select(p => new LabelPoint(p.GetProperty("x").GetDouble(), p.GetProperty("y").GetDouble()))
            .ToList();
        if (points.Count < BottleShape.MinOutlinePoints) return null;
        var complete = b.TryGetProperty("isComplete", out var c) && c.ValueKind == JsonValueKind.True;
        return new BottleDetection(points, complete);
    }

    private static FieldSource SourceOf(JsonElement e) =>
        Str(e, "source") switch
        {
            "web" => FieldSource.Web,
            "estimate" => FieldSource.Estimate,
            _ => FieldSource.Label,
        };

    private static string? TypeOf(JsonElement e) => e.ValueKind == JsonValueKind.Object ? Str(e, "type") : null;

    private static string? Str(JsonElement e, string name) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;
}
