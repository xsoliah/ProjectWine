namespace WineCellar.Domain;

/// <summary>
/// An archive entry: bottles of a wine that were drunk, sold or gifted.
/// Ratings and tasting notes only exist for drunk wines.
/// </summary>
public class ConsumptionRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WineId { get; set; }
    public Wine Wine { get; set; } = null!;
    public string OwnerId { get; set; } = string.Empty;

    public ConsumptionKind Kind { get; set; }
    public int Quantity { get; set; } = 1;
    public DateOnly Date { get; set; }

    /// <summary>Buyer (sold) or recipient (gifted); optional note for drunk wines.</summary>
    public string? Counterparty { get; set; }
    public decimal? Price { get; set; }

    /// <summary>0.5 to 5 stars in half steps. Only for <see cref="ConsumptionKind.Drunk"/>.</summary>
    public double? Rating { get; set; }
    public string? TastingNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public void UpdateDetails(double? rating, string? tastingNote, string? counterparty, decimal? price)
    {
        if (Kind != ConsumptionKind.Drunk && (rating is not null || !string.IsNullOrWhiteSpace(tastingNote)))
            throw new DomainException("Bewertungen und Verkostungsnotizen sind nur für getrunkene Weine möglich.");

        EnsureValidRating(rating);
        if (price is < 0m) throw new DomainException("Der Preis darf nicht negativ sein.");

        Rating = rating;
        TastingNote = tastingNote;
        Counterparty = counterparty;
        Price = price;
    }

    public static void EnsureValidRating(double? rating)
    {
        if (rating is not { } r) return;
        if (r < 0.5 || r > 5 || Math.Abs(r * 2 - Math.Round(r * 2)) > 1e-9)
            throw new DomainException("Ungültige Bewertung: erlaubt sind 0,5 bis 5 Sterne in Halbschritten.");
    }
}
