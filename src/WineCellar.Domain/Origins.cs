namespace WineCellar.Domain;

/// <summary>A wine-producing country in a user's own origin list.</summary>
public class Country
{
    public const int MaxNameLength = 100;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    /// <summary>Trimmed, upper-case name; unique per owner (case-insensitive uniqueness).</summary>
    public string NormalizedName { get; private set; } = string.Empty;

    public List<Region> Regions { get; } = [];

    public void Rename(string? name) => (Name, NormalizedName) = OriginName.Validate(name, "des Landes");
}

/// <summary>A wine region. Every region belongs to exactly one <see cref="Country"/>.</summary>
public class Region
{
    public const int MaxNameLength = 100;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CountryId { get; set; }
    public Country Country { get; set; } = null!;
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    /// <summary>Trimmed, upper-case name; unique per country.</summary>
    public string NormalizedName { get; private set; } = string.Empty;

    public void Rename(string? name) => (Name, NormalizedName) = OriginName.Validate(name, "der Region");
}

public static class OriginName
{
    public static string Normalize(string name) => name.Trim().ToUpperInvariant();

    internal static (string Name, string Normalized) Validate(string? name, string what)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) throw new DomainException($"Der Name {what} darf nicht leer sein.");
        if (trimmed.Length > Country.MaxNameLength)
            throw new DomainException($"Der Name {what} darf höchstens {Country.MaxNameLength} Zeichen lang sein.");
        return (trimmed, Normalize(trimmed));
    }
}
