namespace WineCellar.Domain;

/// <summary>Rules for the drinking curve: a normal distribution around the optimal drinking year.</summary>
public static class DrinkingCurve
{
    public const double MinSpread = 0.5;
    public const double MaxSpread = 50;

    /// <summary>Curve from a drinking window: peak in the middle, spread a quarter of its width (at least <see cref="MinSpread"/>).</summary>
    public static (int Peak, double Spread) FromWindow(int from, int until)
    {
        var peak = (int)Math.Round((from + until) / 2.0, MidpointRounding.AwayFromZero);
        var spread = Math.Max(MinSpread, Math.Round((until - from) / 4.0, 2));
        return (peak, spread);
    }

    /// <summary>Peak between the vintage (or 1800) and the current year + 100, spread between 0.5 and 50.</summary>
    public static bool IsPlausible(int peak, double spread, int? vintage, int currentYear) =>
        peak >= Math.Max(1800, vintage ?? 1800) && peak <= currentYear + 100
        && !double.IsNaN(spread) && spread >= MinSpread && spread <= MaxSpread;
}
