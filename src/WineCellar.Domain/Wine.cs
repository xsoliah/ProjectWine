namespace WineCellar.Domain;

/// <summary>
/// A wine in a user's cellar (one entry per wine/vintage, with a bottle count).
/// Bottles that leave the cellar become <see cref="ConsumptionRecord"/>s (the archive).
/// </summary>
public class Wine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;

    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Producer { get; set; }
    public int? Vintage { get; set; }
    public WineType Type { get; set; } = WineType.Red;
    public Guid? CountryId { get; set; }
    public Country? Country { get; set; }
    public Guid? RegionId { get; set; }
    public Region? Region { get; set; }
    public int BottleSizeMl { get; set; } = 750;

    /// <summary>Bottles currently in the cellar.</summary>
    public int Quantity { get; private set; }

    public int? DrinkFrom { get; set; }
    public int? DrinkUntil { get; set; }
    public decimal? PurchasePrice { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<ConsumptionRecord> Records { get; } = [];

    /// <summary>Grape varieties in their order (see <see cref="SetGrapes"/>).</summary>
    public List<WineGrape> Grapes { get; } = [];

    /// <summary>Rack slots holding bottles of this wine (at most <see cref="Quantity"/>).</summary>
    public List<RackSlot> Slots { get; } = [];

    /// <summary>Extracted label image (standard format), shown in the cellar and detail view.</summary>
    public Guid? LabelImageId { get; set; }

    /// <summary>Original photo the label was cut from; only used by the corner editor.</summary>
    public Guid? LabelSourceImageId { get; set; }

    /// <summary>Corners last used to cut the label (JSON of <see cref="WineCellar.Domain.LabelCorners"/>).</summary>
    public string? LabelCornersJson { get; set; }

    /// <summary>Bottle measurements (JSON of <see cref="BottleShape"/>): profile, label placement, outline.</summary>
    public string? BottleShapeJson { get; set; }

    /// <summary>Bottle cut out of the original photo (PNG with transparent background).</summary>
    public Guid? BottleImageId { get; set; }

    /// <summary>Two or more grape varieties make a cuvée; exactly one means single-varietal.</summary>
    public bool IsCuvee => Grapes.Count >= 2;

    /// <summary>
    /// Replaces the grape varieties. Each variety at most once; shares 1-100 percent, together at most 100.
    /// Existing entries are updated in place so EF Core does not delete and re-insert the same key.
    /// </summary>
    public void SetGrapes(IReadOnlyList<GrapeShare> grapes)
    {
        if (grapes.Select(g => g.GrapeVarietyId).Distinct().Count() != grapes.Count)
            throw new DomainException("Eine Rebsorte darf pro Wein nur einmal vorkommen.");
        if (grapes.Any(g => g.Percent is < 1 or > 100))
            throw new DomainException("Der Anteil einer Rebsorte muss zwischen 1 und 100 Prozent liegen.");
        if (grapes.Sum(g => g.Percent ?? 0) > 100)
            throw new DomainException("Die Anteile der Rebsorten dürfen zusammen höchstens 100 % ergeben.");

        Grapes.RemoveAll(existing => grapes.All(g => g.GrapeVarietyId != existing.GrapeVarietyId));
        for (var i = 0; i < grapes.Count; i++)
        {
            var entry = Grapes.FirstOrDefault(e => e.GrapeVarietyId == grapes[i].GrapeVarietyId);
            if (entry is null)
            {
                entry = new WineGrape { WineId = Id, GrapeVarietyId = grapes[i].GrapeVarietyId };
                Grapes.Add(entry);
            }
            entry.Position = i;
            entry.Percent = grapes[i].Percent;
        }
        Grapes.Sort((a, b) => a.Position.CompareTo(b.Position));
    }

    public void AddBottles(int count)
    {
        if (count <= 0) throw new DomainException("Die Anzahl muss größer als 0 sein.");
        Quantity += count;
    }

    /// <summary>Inventory correction (e.g. when editing a wine).</summary>
    public void SetQuantity(int quantity)
    {
        if (quantity < 0) throw new DomainException("Die Anzahl darf nicht negativ sein.");
        Quantity = quantity;
    }

    /// <summary>
    /// Removes bottles from the cellar and returns the archive entry for them.
    /// The caller is responsible for adding the record to the database context.
    /// </summary>
    public ConsumptionRecord Consume(
        ConsumptionKind kind,
        int quantity,
        DateOnly date,
        string? counterparty,
        decimal? price,
        double? rating,
        string? tastingNote)
    {
        if (quantity <= 0) throw new DomainException("Die Anzahl muss größer als 0 sein.");
        if (quantity > Quantity)
        {
            throw new DomainException(Quantity == 0
                ? "Es ist keine Flasche mehr im Keller."
                : $"Es sind nur {Quantity} Flasche(n) im Keller.");
        }

        var record = new ConsumptionRecord
        {
            WineId = Id,
            OwnerId = OwnerId,
            Kind = kind,
            Quantity = quantity,
            Date = date
        };
        record.UpdateDetails(rating, tastingNote, counterparty, price); // validates before we mutate
        Quantity -= quantity;
        return record;
    }

    public void EnsureValid(int currentYear)
    {
        if (string.IsNullOrWhiteSpace(Name)) throw new DomainException("Der Name des Weins darf nicht leer sein.");
        if (Name.Length > 200) throw new DomainException("Der Name des Weins darf höchstens 200 Zeichen lang sein.");
        if (Vintage is { } v && (v < 1800 || v > currentYear + 1)) throw new DomainException($"Ungültiger Jahrgang: {v}.");
        if (BottleSizeMl is < 50 or > 30000) throw new DomainException("Ungültige Flaschengröße.");
        if (DrinkFrom is { } from && DrinkUntil is { } until && until < from)
            throw new DomainException("Das Ende des Trinkfensters liegt vor dessen Beginn.");
        if (PurchasePrice is < 0m) throw new DomainException("Der Preis darf nicht negativ sein.");
    }
}
