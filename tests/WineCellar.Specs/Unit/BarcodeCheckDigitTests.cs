using WineCellar.Application;

namespace WineCellar.Specs.Unit;

public class BarcodeCheckDigitTests
{
    [Theory]
    [InlineData("4006381333931")]
    [InlineData("4001234567891")]
    [InlineData("96385074")]
    [InlineData("036000291452")]
    [InlineData("14006381333938")]
    public void Valid_codes_pass(string code) => Assert.True(BarcodeNormalizer.HasValidCheckDigit(code));

    [Theory]
    [InlineData("4006381333932")]
    [InlineData("96385075")]
    [InlineData("12345")]
    [InlineData("abcdefghijklm")]
    public void Invalid_codes_fail(string code) => Assert.False(BarcodeNormalizer.HasValidCheckDigit(code));

    [Fact]
    public void Checked_normalization_strips_spaces_and_rejects_wrong_digits()
    {
        Assert.Equal("4006381333931", BarcodeNormalizer.TryNormalizeChecked("4006 3813-33931"));
        Assert.Null(BarcodeNormalizer.TryNormalizeChecked("4006381333932"));
        Assert.Null(BarcodeNormalizer.TryNormalizeChecked(null));
    }
}
