using WineCellar.Infrastructure.Research;

namespace WineCellar.Specs.Unit;

public class ResearchPromptTests
{
    [Fact]
    public void Known_barcode_is_passed_as_authoritative_fact()
    {
        var text = ResearchPrompt.UserInstruction("Geschenk", "4006381333931");
        Assert.Contains("4006381333931", text);
        Assert.Contains("do not change it", text);
        Assert.Contains("Geschenk", text);
    }

    [Fact]
    public void Without_a_known_barcode_the_instruction_stays_plain()
    {
        Assert.DoesNotContain("barcode", ResearchPrompt.UserInstruction(null, null));
    }
}
