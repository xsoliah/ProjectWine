using Microsoft.EntityFrameworkCore;
using WineCellar.Domain;

namespace WineCellar.Application.Services;

/// <summary>
/// Proposes free rack slots for not yet placed bottles of a wine so that similar wines lie together.
/// Rule based and deterministic (see <see cref="PlacementPlanner"/>); only reads data.
/// </summary>
public class PlacementSuggestionService(IAppDbContext db, ICurrentUser user)
{
    /// <param name="count">Bottles to place; defaults to (and is capped at) the wine's not placed bottles.</param>
    public async Task<PlacementSuggestionDto> SuggestAsync(Guid wineId, int? count, CancellationToken ct = default)
    {
        var wine = await db.Wines.AsNoTracking()
                       .Include(w => w.Slots)
                       .Include(w => w.Country)
                       .Include(w => w.Region)
                       .FirstOrDefaultAsync(w => w.Id == wineId && w.OwnerId == user.UserId, ct)
                   ?? throw new NotFoundException("Wein nicht gefunden.");

        var unplaced = Math.Max(0, wine.Quantity - wine.Slots.Count);
        var requested = count is > 0 ? Math.Min(count.Value, unplaced) : unplaced;
        if (requested == 0)
            return new PlacementSuggestionDto(wine.Id, 0, [], 0, "Es gibt keine nicht eingelagerten Flaschen.");

        var racks = await db.Racks.AsNoTracking()
            .Where(r => r.OwnerId == user.UserId)
            .Include(r => r.Slots).ThenInclude(s => s.Wine).ThenInclude(w => w.Country)
            .Include(r => r.Slots).ThenInclude(s => s.Wine).ThenInclude(w => w.Region)
            .ToListAsync(ct);

        var planned = racks
            .Select(r => new PlacementRack(r.Id, r.Name, r.Height, r.Width,
                r.Slots.ToDictionary(s => (s.Row, s.Column), s => PlacementWine.From(s.Wine))))
            .ToList();

        return PlacementPlanner.Plan(PlacementWine.From(wine), planned, requested);
    }
}

/// <summary>The attributes of a wine that matter for the neighbourhood.</summary>
public sealed record PlacementWine(
    Guid Id,
    string Name,
    string? Producer,
    Guid? RegionId,
    string? RegionName,
    Guid? CountryId,
    string? CountryName,
    WineType Type,
    int? Vintage,
    int? DrinkFrom,
    int? DrinkUntil)
{
    public static PlacementWine From(Wine w) => new(w.Id, w.Name, w.Producer, w.RegionId, w.Region?.Name,
        w.CountryId, w.Country?.Name, w.Type, w.Vintage, w.DrinkFrom, w.DrinkUntil);
}

/// <summary>A rack as the planner sees it: size and occupied slots (row, column) → wine.</summary>
public sealed record PlacementRack(
    Guid Id,
    string Name,
    int Height,
    int Width,
    IReadOnlyDictionary<(int Row, int Column), PlacementWine> Occupied);

/// <summary>Why two wines count as similar - the strongest shared trait, in ranking order.</summary>
public enum SimilarityKind { None, Window, Type, Country, Region, Producer, SameWine }

/// <summary>Scoring rules and slot selection; pure, so it can be tested without a database.</summary>
public static class PlacementPlanner
{
    // ----- Weights (points); the ranking wine > producer > region > country > type follows from them -----
    public const int PointsSameWine = 100;
    public const int PointsProducer = 40;
    public const int PointsRegion = 25;
    public const int PointsCountry = 20;
    public const int PointsType = 15;
    public const int PointsVintage = 5;
    public const int PointsDrinkWindow = 5;
    public const int MaxVintageGap = 2;
    public const int MaxWindowGap = 3;

    public const double WeightSameRowNear = 1.0;
    public const double WeightSameRowFar = 0.5;
    public const double WeightAdjacentRow = 0.35;
    public const double RestShare = 1.0 / 3.0;
    public const double PenaltyStranger = 5;
    public const double BonusEmptySurroundings = 3;

    /// <summary>Similarity of two wines in points, plus the strongest shared trait.</summary>
    public static (int Points, SimilarityKind Kind) Similarity(PlacementWine a, PlacementWine b)
    {
        if (a.Id == b.Id) return (PointsSameWine, SimilarityKind.SameWine);

        var points = 0;
        var kind = SimilarityKind.None;
        void Add(int p, SimilarityKind k)
        {
            points += p;
            if (k > kind) kind = k;
        }

        var pa = Normalize(a.Producer);
        if (pa.Length > 0 && pa == Normalize(b.Producer)) Add(PointsProducer, SimilarityKind.Producer);
        if (a.RegionId is not null && a.RegionId == b.RegionId) Add(PointsRegion, SimilarityKind.Region);
        if (a.CountryId is not null && a.CountryId == b.CountryId) Add(PointsCountry, SimilarityKind.Country);
        if (a.Type == b.Type) Add(PointsType, SimilarityKind.Type);
        if (a.Vintage is { } va && b.Vintage is { } vb && Math.Abs(va - vb) <= MaxVintageGap)
            Add(PointsVintage, SimilarityKind.Window);
        if (WindowsClose(a, b)) Add(PointsDrinkWindow, SimilarityKind.Window);
        return (points, kind);
    }

    private static bool WindowsClose(PlacementWine a, PlacementWine b)
    {
        if ((a.DrinkFrom ?? a.DrinkUntil) is not { } aFrom || (a.DrinkUntil ?? a.DrinkFrom) is not { } aUntil) return false;
        if ((b.DrinkFrom ?? b.DrinkUntil) is not { } bFrom || (b.DrinkUntil ?? b.DrinkFrom) is not { } bUntil) return false;
        var gap = Math.Max(aFrom, bFrom) - Math.Min(aUntil, bUntil); // <= 0 when they overlap
        return gap <= MaxWindowGap;
    }

    private static string Normalize(string? text) => (text ?? string.Empty).Trim().ToUpperInvariant();

    private sealed class Grid(PlacementRack rack)
    {
        public PlacementRack Rack { get; } = rack;
        public Dictionary<(int Row, int Column), PlacementWine> Cells { get; } = new(rack.Occupied);
        public int Free => Rack.Height * Rack.Width - Cells.Count;
    }

    /// <summary>Value of one free slot from its neighbours; also names the wine that mattered most.</summary>
    private sealed record CellScore(double Value, double BestScore, PlacementWine? BestNeighbour, SimilarityKind Kind);

    private static readonly (int dRow, int dCol, double weight, bool direct)[] Neighbourhood =
    [
        (0, -1, WeightSameRowNear, true), (0, 1, WeightSameRowNear, true),
        (0, -2, WeightSameRowFar, false), (0, 2, WeightSameRowFar, false),
        (-1, 0, WeightAdjacentRow, true), (1, 0, WeightAdjacentRow, true),
        (-1, -1, WeightAdjacentRow, false), (-1, 1, WeightAdjacentRow, false),
        (1, -1, WeightAdjacentRow, false), (1, 1, WeightAdjacentRow, false)
    ];

    private static CellScore Score(Grid grid, PlacementWine wine, int row, int column)
    {
        double best = 0, sum = 0, penalty = 0;
        PlacementWine? bestNeighbour = null;
        var kind = SimilarityKind.None;
        var any = false;

        foreach (var (dRow, dCol, weight, direct) in Neighbourhood)
        {
            if (!grid.Cells.TryGetValue((row + dRow, column + dCol), out var neighbour)) continue;
            any = true;
            var (points, k) = Similarity(wine, neighbour);
            var weighted = points * weight;
            sum += weighted;
            if (bestNeighbour is null || weighted > best)
            {
                best = weighted;
                bestNeighbour = neighbour;
                kind = k;
            }
            if (direct && points == 0) penalty += PenaltyStranger;
        }

        if (!any) return new CellScore(BonusEmptySurroundings, 0, null, SimilarityKind.None);
        var value = best + (sum - best) * RestShare - penalty;
        return new CellScore(value, best, bestNeighbour, kind);
    }

    /// <summary>Picks free slots for <paramref name="count"/> bottles of <paramref name="wine"/>.</summary>
    public static PlacementSuggestionDto Plan(PlacementWine wine, IReadOnlyList<PlacementRack> racks, int count)
    {
        var grids = racks.Select(r => new Grid(r)).ToList();
        var anyOccupied = grids.Any(g => g.Cells.Count > 0);
        var chosen = new List<SuggestedSlotDto>();
        string? reason = null;

        while (chosen.Count < count)
        {
            var longest = grids.Select(LongestRun).DefaultIfEmpty(0).Max();
            if (longest == 0) break;
            var length = Math.Min(count - chosen.Count, longest);

            var best = BestSection(grids, wine, length);
            if (reason is null) reason = Explain(wine, best.Scores, anyOccupied);

            for (var i = 0; i < length; i++)
            {
                var column = best.Column + i;
                best.Grid.Cells[(best.Row, column)] = wine; // later sections lean against the earlier ones
                chosen.Add(new SuggestedSlotDto(best.Grid.Rack.Id, best.Grid.Rack.Name, best.Row, column));
            }
        }

        var unplaceable = count - chosen.Count;
        reason ??= "Es ist kein freies Fach vorhanden.";
        if (unplaceable > 0)
            reason += unplaceable == 1
                ? " Für 1 Flasche ist kein Platz."
                : $" Für {unplaceable} Flaschen ist kein Platz.";
        return new PlacementSuggestionDto(wine.Id, count, chosen, unplaceable, reason);
    }

    private sealed record Section(Grid Grid, int Row, int Column, double Value, IReadOnlyList<CellScore> Scores);

    private static Section BestSection(List<Grid> grids, PlacementWine wine, int length)
    {
        Section? best = null;
        foreach (var grid in grids)
        {
            for (var row = 1; row <= grid.Rack.Height; row++)
            for (var start = 1; start + length - 1 <= grid.Rack.Width; start++)
            {
                if (!IsFree(grid, row, start, length)) continue;
                var scores = Enumerable.Range(start, length).Select(c => Score(grid, wine, row, c)).ToList();
                var candidate = new Section(grid, row, start, scores.Sum(s => s.Value), scores);
                if (best is null || IsBetter(candidate, best)) best = candidate;
            }
        }
        return best!;
    }

    /// <summary>Higher value wins; ties: rack with more free slots, rack name, row, column.</summary>
    private static bool IsBetter(Section a, Section b)
    {
        if (Math.Abs(a.Value - b.Value) > 1e-9) return a.Value > b.Value;
        if (a.Grid.Free != b.Grid.Free) return a.Grid.Free > b.Grid.Free;
        var byName = string.Compare(a.Grid.Rack.Name, b.Grid.Rack.Name, StringComparison.CurrentCultureIgnoreCase);
        if (byName != 0) return byName < 0;
        if (a.Grid.Rack.Id != b.Grid.Rack.Id) return a.Grid.Rack.Id.CompareTo(b.Grid.Rack.Id) < 0;
        if (a.Row != b.Row) return a.Row < b.Row;
        return a.Column < b.Column;
    }

    private static bool IsFree(Grid grid, int row, int start, int length)
    {
        for (var c = start; c < start + length; c++)
            if (grid.Cells.ContainsKey((row, c))) return false;
        return true;
    }

    private static int LongestRun(Grid grid)
    {
        var longest = 0;
        for (var row = 1; row <= grid.Rack.Height; row++)
        {
            var run = 0;
            for (var column = 1; column <= grid.Rack.Width; column++)
            {
                run = grid.Cells.ContainsKey((row, column)) ? 0 : run + 1;
                longest = Math.Max(longest, run);
            }
        }
        return longest;
    }

    private static string Explain(PlacementWine wine, IReadOnlyList<CellScore> scores, bool anyOccupied)
    {
        if (!anyOccupied) return "Noch keine Weine eingelagert – erste freie Fächer.";

        var top = scores.OrderByDescending(s => s.BestScore).First();
        if (top.BestNeighbour is null || top.BestScore <= 0 || top.Kind == SimilarityKind.None)
            return "Freie Ecke, da nichts Ähnliches vorhanden.";

        var n = top.BestNeighbour;
        return top.Kind switch
        {
            SimilarityKind.SameWine => $"Neben deinen anderen Flaschen von „{wine.Name}“.",
            SimilarityKind.Producer => $"Neben anderen Weinen von {n.Producer?.Trim()}.",
            SimilarityKind.Region => $"Neben deinen Weinen aus {n.RegionName}.",
            SimilarityKind.Country => $"Neben deinen Weinen aus {n.CountryName}.",
            SimilarityKind.Type => $"Neben deinen {TypeText(n.Type)}.",
            _ => "Neben Weinen mit ähnlichem Jahrgang bzw. Trinkfenster."
        };
    }

    private static string TypeText(WineType type) => type switch
    {
        WineType.Red => "Rotweinen",
        WineType.White => "Weißweinen",
        WineType.Rose => "Roséweinen",
        WineType.Sparkling => "Schaumweinen",
        WineType.Dessert => "Süßweinen",
        WineType.Fortified => "Likörweinen",
        _ => "Weinen"
    };
}
