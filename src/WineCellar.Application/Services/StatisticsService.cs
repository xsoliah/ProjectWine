using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>Key figures and bottle distribution of the user's cellar (bottles in the cellar only, not the archive).</summary>
public class StatisticsService(IAppDbContext db, ICurrentUser user)
{
    /// <summary>More segments than this are reduced to the largest (<c>MaxSegments - 1</c>) plus "Sonstige".</summary>
    public const int MaxSegments = 8;

    public const string UnknownKey = "none";
    public const string OtherKey = "other";
    public const string CuveeKey = "cuvee";

    public async Task<StatisticsDto> GetAsync(
        StatisticsGrouping groupBy, Guid? countryId = null, bool cuvee = false, CancellationToken ct = default)
    {
        if (countryId is not null && groupBy != StatisticsGrouping.Region)
            throw new DomainException("Eine Einschränkung auf ein Land ist nur bei der Gruppierung nach Region möglich.");
        if (cuvee && groupBy != StatisticsGrouping.Grape)
            throw new DomainException("Die Aufteilung der Cuvées ist nur bei der Gruppierung nach Rebsorte möglich.");

        // One small projection per request; grouping happens in memory because labels, producer
        // normalization and the "Sonstige" rule are easier to keep correct (and testable) here.
        var wines = await db.Wines.AsNoTracking()
            .Where(w => w.OwnerId == user.UserId && w.Quantity > 0)
            .Select(w => new Row(
                w.Type,
                w.Quantity,
                w.PurchasePrice,
                w.Producer,
                w.CountryId,
                w.Country != null ? w.Country.Name : null,
                w.RegionId,
                w.Region != null ? w.Region.Name : null,
                w.Grapes.OrderBy(g => g.Position)
                    .Select(g => new GrapeRef(g.GrapeVarietyId, g.GrapeVariety.Name))
                    .ToList()))
            .ToListAsync(ct);

        var totals = new StatisticsTotalsDto(
            Bottles: wines.Sum(w => w.Quantity),
            Wines: wines.Count,
            TotalValue: wines.Where(w => w.Price is not null).Sum(w => w.Quantity * w.Price!.Value),
            WinesWithoutPrice: wines.Count(w => w.Price is null));

        OriginRefDto? drillCountry = null;
        if (countryId is { } cid)
        {
            var country = await db.Countries.AsNoTracking()
                              .FirstOrDefaultAsync(c => c.Id == cid && c.OwnerId == user.UserId, ct)
                          ?? throw new NotFoundException("Land nicht gefunden.");
            drillCountry = new OriginRefDto(country.Id, country.Name);
            wines = wines.Where(w => w.CountryId == cid).ToList();
        }

        if (cuvee) wines = wines.Where(w => w.Grapes.Count >= 2).ToList();

        var groups = groupBy switch
        {
            StatisticsGrouping.Type => wines.GroupBy(w => w.Type.ToString()).Select(g => Group(g.Key, g.Key, g)),
            StatisticsGrouping.Country => wines.GroupBy(w => w.CountryId).Select(g => g.Key is null
                ? Unknown(UnknownKey, "Ohne Angabe", g)
                : Group(g.Key.Value.ToString(), g.First().CountryName!, g)),
            StatisticsGrouping.Region when drillCountry is not null => wines.GroupBy(w => w.RegionId).Select(g => g.Key is null
                ? Unknown($"{UnknownKey}:{drillCountry.Id}", "Ohne Region", g)
                : Group(g.Key.Value.ToString(), g.First().RegionName!, g)),
            StatisticsGrouping.Region => wines.GroupBy(w => (w.CountryId, w.RegionId)).Select(g => g.Key switch
            {
                (null, _) => Unknown(UnknownKey, "Ohne Angabe", g),
                (var c, null) => Group($"{UnknownKey}:{c}", $"Ohne Region ({g.First().CountryName})", g, isUnknown: true),
                (_, var r) => Group(r.Value.ToString(), $"{g.First().RegionName} ({g.First().CountryName})", g)
            }),
            StatisticsGrouping.Producer => wines
                .GroupBy(w => string.IsNullOrWhiteSpace(w.Producer) ? null : w.Producer.Trim().ToUpperInvariant())
                .Select(g => g.Key is null
                    ? Unknown(UnknownKey, "Ohne Angabe", g)
                    // Display the alphabetically first spelling that occurs in the group.
                    : Group(g.Key, g.Select(w => w.Producer!.Trim()).Order(StringComparer.Ordinal).First(), g)),
            StatisticsGrouping.Grape when cuvee => wines
                // Same varieties regardless of order and shares form one composition.
                .GroupBy(w => string.Join("+", w.Grapes.Select(g => g.Id).Order()))
                .Select(g => Group(g.Key,
                    string.Join(", ", g.First().Grapes.Select(x => x.Name).Order(StringComparer.CurrentCultureIgnoreCase)),
                    g)),
            StatisticsGrouping.Grape => wines.GroupBy(w => w.Grapes.Count switch
                {
                    0 => UnknownKey,
                    1 => w.Grapes[0].Id.ToString(),
                    _ => CuveeKey
                })
                .Select(g => g.Key switch
                {
                    UnknownKey => Unknown(UnknownKey, "Ohne Angabe", g),
                    CuveeKey => Group(CuveeKey, "Cuvée", g),
                    _ => Group(g.Key, g.First().Grapes[0].Name, g)
                }),
            _ => throw new DomainException($"Unbekannte Gruppierung '{groupBy}'.")
        };

        var segments = BuildSegments(groups.ToList(), totals.Bottles == 0 ? 0 : wines.Sum(w => w.Quantity));
        return new StatisticsDto(totals, groupBy, drillCountry, segments, cuvee ? CuveeKey : null);
    }

    private static List<StatisticsSegmentDto> BuildSegments(List<Segment> groups, int total)
    {
        // "Ohne Angabe" (and "Ohne Region" in the drill-down) always comes last; everything else by size, then name.
        var last = groups.Where(g => g.TrailsAtEnd).ToList();
        var ordered = groups.Where(g => !g.TrailsAtEnd)
            .OrderByDescending(g => g.Bottles)
            .ThenBy(g => g.Label, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        var result = new List<StatisticsSegmentDto>();
        if (ordered.Count > MaxSegments)
        {
            var shown = ordered.Take(MaxSegments - 1).ToList();
            var rest = ordered.Skip(MaxSegments - 1).ToList();
            result.AddRange(shown.Select(g => ToDto(g, total)));
            result.Add(new StatisticsSegmentDto(
                OtherKey, "Sonstige", rest.Sum(g => g.Bottles), Percent(rest.Sum(g => g.Bottles), total),
                Children: rest.Select(g => ToDto(g, total)).ToList()));
        }
        else
        {
            result.AddRange(ordered.Select(g => ToDto(g, total)));
        }

        result.AddRange(last.Select(g => ToDto(g, total)));
        return result;
    }

    private static StatisticsSegmentDto ToDto(Segment s, int total) =>
        new(s.Key, s.Label, s.Bottles, Percent(s.Bottles, total), s.IsUnknown);

    private static int Percent(int bottles, int total) =>
        total == 0 ? 0 : (int)Math.Round(100.0 * bottles / total, MidpointRounding.AwayFromZero);

    private static Segment Group(string key, string label, IEnumerable<Row> rows, bool isUnknown = false) =>
        new(key, label, rows.Sum(r => r.Quantity), isUnknown, TrailsAtEnd: false);

    private static Segment Unknown(string key, string label, IEnumerable<Row> rows) =>
        new(key, label, rows.Sum(r => r.Quantity), IsUnknown: true, TrailsAtEnd: true);

    private sealed record Row(
        WineType Type,
        int Quantity,
        decimal? Price,
        string? Producer,
        Guid? CountryId,
        string? CountryName,
        Guid? RegionId,
        string? RegionName,
        List<GrapeRef> Grapes);

    private sealed record GrapeRef(Guid Id, string Name);

    private sealed record Segment(string Key, string Label, int Bottles, bool IsUnknown, bool TrailsAtEnd);
}
