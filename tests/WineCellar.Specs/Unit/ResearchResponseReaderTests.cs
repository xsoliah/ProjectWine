using System.Text.Json;
using WineCellar.Application.Capture;
using WineCellar.Domain;
using WineCellar.Infrastructure.Research;

namespace WineCellar.Specs.Unit;

/// <summary>Reading a recorded Messages API answer (content blocks) without network access.</summary>
public class ResearchResponseReaderTests
{
    private const string Answer = """
        {"isWineLabel":true,"summary":"Sassicaia 2021 von Tenuta San Guido erkannt.",
         "name":{"value":"Sassicaia","source":"label"},"producer":{"value":"Tenuta San Guido","source":"label"},
         "vintage":{"value":2021,"source":"label"},"type":{"value":"Red","source":"web"},
         "country":{"value":"Italien","source":"web"},"region":{"value":"Bolgheri","source":"label"},
         "bottleSizeMl":{"value":750,"source":"label"},"drinkFrom":{"value":2028,"source":"web"},
         "drinkUntil":{"value":2045,"source":"web"},"barcode":null,"notes":{"value":"Kraftvoll und elegant.","source":"web"},
         "grapes":[{"name":"Cabernet Sauvignon","percent":85,"source":"web"},{"name":"Cabernet Franc","percent":15,"source":"web"}],
         "labelCorners":{"topLeft":{"x":0.31,"y":0.22},"topRight":{"x":0.69,"y":0.21},"bottomRight":{"x":0.7,"y":0.78},"bottomLeft":{"x":0.3,"y":0.79}}}
        """;

    private static IReadOnlyList<JsonElement> Blocks(string finalText) =>
    [
        Parse("""{"type":"thinking","thinking":"","signature":"abc"}"""),
        Parse("""{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{"query":"Sassicaia 2021"}}"""),
        Parse("""
            {"type":"web_search_tool_result","tool_use_id":"srvtoolu_1","content":[
              {"type":"web_search_result","url":"https://www.tenutasanguido.com/sassicaia","title":"Sassicaia – Tenuta San Guido","encrypted_content":"x","page_age":null},
              {"type":"web_search_result","url":"https://www.example-wine.test/sassicaia-2021","title":"Sassicaia 2021","encrypted_content":"y","page_age":"2024-01-01"}]}
            """),
        Parse("""{"type":"server_tool_use","id":"srvtoolu_2","name":"web_fetch","input":{"url":"https://www.tenutasanguido.com/sassicaia"}}"""),
        Parse("""
            {"type":"web_fetch_tool_result","tool_use_id":"srvtoolu_2","content":{"type":"web_fetch_result",
              "url":"https://www.tenutasanguido.com/sassicaia","retrieved_at":"2026-11-26T10:00:00Z",
              "content":{"type":"document","title":"Sassicaia – Tenuta San Guido","source":{"type":"text","media_type":"text/plain","data":"..."}}}}
            """),
        Parse("""{"type":"server_tool_use","id":"srvtoolu_3","name":"web_search","input":{"query":"x"}}"""),
        Parse("""{"type":"web_search_tool_result","tool_use_id":"srvtoolu_3","content":{"type":"web_search_tool_result_error","error_code":"max_uses_exceeded"}}"""),
        Parse(JsonSerializer.Serialize(new { type = "text", text = finalText })),
    ];

    [Fact]
    public void Reads_fields_with_their_source_grapes_and_corners()
    {
        var r = ResearchResponseReader.Read("end_turn", Blocks(Answer));

        Assert.True(r.IsWineLabel);
        Assert.Equal(new Researched<string>("Sassicaia", FieldSource.Label), r.Name);
        Assert.Equal(new Researched<int>(2021, FieldSource.Label), r.Vintage);
        Assert.Equal(new Researched<WineType>(WineType.Red, FieldSource.Web), r.Type);
        Assert.Null(r.Barcode);
        Assert.Equal(["Cabernet Sauvignon", "Cabernet Franc"], r.Grapes.Select(g => g.Name));
        Assert.Equal(85, r.Grapes[0].Percent);
        Assert.NotNull(r.LabelCorners);
        Assert.True(r.LabelCorners!.IsPlausible());
    }

    [Fact]
    public void Sources_come_from_the_tool_results_without_duplicates()
    {
        var r = ResearchResponseReader.Read("end_turn", Blocks(Answer));
        Assert.Equal(
            ["https://www.tenutasanguido.com/sassicaia", "https://www.example-wine.test/sassicaia-2021"],
            r.Sources.Select(s => s.Url));
        Assert.Equal("Sassicaia – Tenuta San Guido", r.Sources[0].Title);
    }

    [Fact]
    public void Refusal_is_checked_before_the_content()
    {
        var ex = Assert.Throws<WineResearchException>(() => ResearchResponseReader.Read("refusal", []));
        Assert.False(ex.IsTransient);
        Assert.Contains("abgelehnt", ex.Message);
    }

    [Fact]
    public void Invalid_json_fails_without_retry()
    {
        var ex = Assert.Throws<WineResearchException>(() => ResearchResponseReader.Read("end_turn", Blocks("Das ist kein JSON")));
        Assert.False(ex.IsTransient);
    }

    [Fact]
    public void Json_wrapped_in_a_code_fence_is_read() =>
        Assert.Equal("Sassicaia", ResearchResponseReader.Read("end_turn", Blocks("Hier das Ergebnis:\n```json\n" + Answer + "\n```")).Name?.Value);

    [Fact]
    public void Truncated_answer_is_transient() =>
        Assert.True(Assert.Throws<WineResearchException>(() => ResearchResponseReader.Read("max_tokens", Blocks(Answer))).IsTransient);

    [Fact]
    public void Unknown_wine_type_is_dropped_not_the_whole_answer()
    {
        var r = ResearchResponseReader.Read("end_turn", Blocks(Answer.Replace("\"Red\"", "\"Orange\"")));
        Assert.Null(r.Type);
        Assert.Equal("Sassicaia", r.Name?.Value);
    }

    [Fact]
    public void Not_a_wine_label()
    {
        var r = ResearchResponseReader.Read("end_turn", Blocks("""{"isWineLabel":false,"summary":"Kein Wein.","name":null,"grapes":[],"labelCorners":null}"""));
        Assert.False(r.IsWineLabel);
        Assert.Null(r.LabelCorners);
    }

    private static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();
}

public class ResearchSanitizeTests
{
    [Fact]
    public void Invalid_single_values_are_cleared_and_the_note_is_shortened()
    {
        var raw = new WineResearchResult
        {
            Name = new("  Hauswein ", FieldSource.Label),
            Vintage = new(1650, FieldSource.Label),
            BottleSizeMl = new(20, FieldSource.Web),
            Barcode = new("12345", FieldSource.Web),
            DrinkFrom = new(2030, FieldSource.Web),
            DrinkUntil = new(2025, FieldSource.Web),
            Notes = new(new string('x', 800), FieldSource.Web),
            Grapes = [new("Merlot", 70, FieldSource.Web), new("Cabernet Franc", 40, FieldSource.Web), new("merlot", 5, FieldSource.Web)],
            LabelCorners = new LabelCorners(new(0.1, 0.1), new(0.1, 0.9), new(0.9, 0.9), new(0.9, 0.1)),
            Sources = [new("A", "https://a.test/x"), new("A again", "https://a.test/x"), new("bad", "javascript:alert(1)")],
        };

        var r = CaptureProcessor.Sanitize(raw, 2026);

        Assert.Equal("Hauswein", r.Name?.Value);
        Assert.Null(r.Vintage);
        Assert.Null(r.BottleSizeMl);
        Assert.Null(r.Barcode);
        Assert.Equal(2030, r.DrinkFrom?.Value);
        Assert.Null(r.DrinkUntil);
        Assert.Equal(CaptureProcessor.MaxNoteLength, r.Notes!.Value.Length);
        Assert.Equal(["Merlot", "Cabernet Franc"], r.Grapes.Select(g => g.Name));
        Assert.All(r.Grapes, g => Assert.Null(g.Percent)); // 70 + 40 > 100: shares dropped
        Assert.Null(r.LabelCorners); // counter-clockwise
        Assert.Equal(["https://a.test/x"], r.Sources.Select(s => s.Url));
    }

    [Fact]
    public void Valid_barcode_is_normalized() =>
        Assert.Equal("4006381333931",
            CaptureProcessor.Sanitize(new WineResearchResult { Barcode = new("4006381 333931", FieldSource.Web) }, 2026).Barcode?.Value);
}
