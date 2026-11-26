namespace WineCellar.Domain;

/// <summary>A grape variety in a user's own list (master data, like countries and regions).</summary>
public class GrapeVariety
{
    public const int MaxNameLength = 100;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    /// <summary>Trimmed, upper-case name; unique per owner (case-insensitive uniqueness).</summary>
    public string NormalizedName { get; private set; } = string.Empty;

    public void Rename(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) throw new DomainException("Der Name der Rebsorte darf nicht leer sein.");
        if (trimmed.Length > MaxNameLength)
            throw new DomainException($"Der Name der Rebsorte darf höchstens {MaxNameLength} Zeichen lang sein.");
        Name = trimmed;
        NormalizedName = OriginName.Normalize(trimmed);
    }
}

/// <summary>One grape variety of a wine, in a fixed order, with an optional share in percent.</summary>
public class WineGrape
{
    public Guid WineId { get; set; }
    public Guid GrapeVarietyId { get; set; }
    public GrapeVariety GrapeVariety { get; set; } = null!;

    /// <summary>0-based order within the wine.</summary>
    public int Position { get; set; }

    /// <summary>1 to 100, or null when unknown.</summary>
    public int? Percent { get; set; }
}

/// <summary>A requested grape of a wine: the variety and its optional share.</summary>
public readonly record struct GrapeShare(Guid GrapeVarietyId, int? Percent);
