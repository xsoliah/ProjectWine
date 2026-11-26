using System.Text.RegularExpressions;

namespace WineCellar.Application;

/// <summary>
/// Splits a free-text grape list ("Cabernet Sauvignon, Cabernet Franc", "Merlot / Carménère",
/// "Zweigelt und Blaufränkisch") into names. The migration AddGrapeVarieties applies the same rule in SQL.
/// </summary>
public static partial class GrapeText
{
    [GeneratedRegex(@"\s*(?:,|;|/|&|\s+und\s+)\s*", RegexOptions.IgnoreCase)]
    private static partial Regex Separator();

    /// <summary>Names in their original order, trimmed, without empty parts and case-insensitive duplicates.</summary>
    public static IReadOnlyList<string> Split(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return Separator().Split(text)
            .Select(part => part.Trim())
            .Where(part => part.Length > 0 && seen.Add(part))
            .Select(part => part.Length > Domain.GrapeVariety.MaxNameLength ? part[..Domain.GrapeVariety.MaxNameLength] : part)
            .ToList();
    }
}
