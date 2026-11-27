using System.Globalization;
using Reqnroll;
using WineCellar.Domain;
using WineCellar.Specs.Support;

namespace WineCellar.Specs.Steps;

[Binding]
public class CommonSteps(TestWorld world)
{
    [Given(@"ich bin als ""([^""]*)"" angemeldet")]
    public async Task GivenLoggedIn(string name) => await world.LoginAsync(name);

    [Then(@"wird die Aktion abgelehnt mit ""([^""]*)""")]
    public void ThenRejected(string fragment)
    {
        Assert.NotNull(world.LastError);
        Assert.Contains(fragment, world.LastError!.Message, StringComparison.OrdinalIgnoreCase);
    }

    public static double ParseStars(string text) => text switch
    {
        "Top" => 6,
        "Hammer" => 7,
        _ => double.Parse(text.Replace(',', '.'), CultureInfo.InvariantCulture),
    };

    public static decimal ParseMoney(string text) =>
        decimal.Parse(text.Replace(',', '.'), CultureInfo.InvariantCulture);

    public static ConsumptionKind ParseKind(string text) => text switch
    {
        "Getrunken" => ConsumptionKind.Drunk,
        "Verkauft" => ConsumptionKind.Sold,
        "Verschenkt" => ConsumptionKind.Gifted,
        _ => throw new ArgumentException($"Unbekannte Art '{text}' (erlaubt: Getrunken, Verkauft, Verschenkt)")
    };
}
