using System.Text.Json;
using WineCellar.Application.Capture;
using WineCellar.Domain;
using WineCellar.Infrastructure.Research;

namespace WineCellar.Specs.Unit;

public class DrinkingCurveTests
{
    [Fact]
    public void Window_gives_middle_and_quarter_of_width()
    {
        Assert.Equal((2028, 2.0), DrinkingCurve.FromWindow(2024, 2032));
        Assert.Equal((2030, 2.0), DrinkingCurve.FromWindow(2026, 2034));
    }

    [Fact]
    public void Narrow_window_keeps_minimum_spread()
    {
        Assert.Equal(DrinkingCurve.MinSpread, DrinkingCurve.FromWindow(2026, 2026).Spread);
    }

    [Theory]
    [InlineData(2031, 3.0, 2020, true)]
    [InlineData(2015, 3.0, 2020, false)]   // before the vintage
    [InlineData(1850, 3.0, null, true)]
    [InlineData(1700, 3.0, null, false)]
    [InlineData(2031, 0.4, 2020, false)]
    [InlineData(2031, 51.0, 2020, false)]
    [InlineData(2200, 3.0, 2020, false)]
    public void Plausibility(int peak, double spread, int? vintage, bool expected) =>
        Assert.Equal(expected, DrinkingCurve.IsPlausible(peak, spread, vintage, 2026));

    [Fact]
    public void Reader_reads_peak_and_spread_with_estimate_source()
    {
        const string answer = """
            {"isWineLabel":true,"summary":"x","name":null,"producer":null,"vintage":null,"type":null,"country":null,
             "region":null,"bottleSizeMl":null,"drinkFrom":null,"drinkUntil":null,
             "drinkPeak":{"value":2031,"source":"estimate"},"drinkSpread":{"value":3.5,"source":"estimate"},
             "barcode":null,"notes":null,"grapes":[],"labelCorners":null,"bottle":null}
            """;
        var block = JsonSerializer.SerializeToElement(new { type = "text", text = answer });
        var result = ResearchResponseReader.Read("end_turn", [block]);
        Assert.Equal(new Researched<int>(2031, FieldSource.Estimate), result.DrinkPeak);
        Assert.Equal(new Researched<double>(3.5, FieldSource.Estimate), result.DrinkSpread);
    }

    [Fact]
    public void Prompt_asks_for_the_curve()
    {
        Assert.Contains("drinkPeak", ResearchSchema.PromptSection);
        Assert.Contains("drinkSpread", ResearchSchema.PromptSection);
        Assert.Contains("drinkPeak", ResearchPrompt.UserInstruction("Barolo", curveOnly: true));
    }
}
