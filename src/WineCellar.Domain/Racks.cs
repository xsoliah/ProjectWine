namespace WineCellar.Domain;

/// <summary>A user's wine rack: a grid of Height rows x Width columns, each slot holds one bottle.</summary>
public class Rack
{
    public const int MaxNameLength = 100;
    public const int MaxSize = 50;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    /// <summary>Trimmed, upper-case name; unique per owner.</summary>
    public string NormalizedName { get; private set; } = string.Empty;

    /// <summary>Number of rows (row 1 is the top row).</summary>
    public int Height { get; private set; }

    /// <summary>Number of columns (column 1 is the left column).</summary>
    public int Width { get; private set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<RackSlot> Slots { get; } = [];

    public int Capacity => Height * Width;

    public void Set(string? name, int height, int width)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) throw new DomainException("Der Name des Regals darf nicht leer sein.");
        if (trimmed.Length > MaxNameLength)
            throw new DomainException($"Der Name des Regals darf höchstens {MaxNameLength} Zeichen lang sein.");
        if (height is < 1 or > MaxSize)
            throw new DomainException($"Die Höhe des Regals muss zwischen 1 und {MaxSize} Reihen liegen.");
        if (width is < 1 or > MaxSize)
            throw new DomainException($"Die Breite des Regals muss zwischen 1 und {MaxSize} Spalten liegen.");

        Name = trimmed;
        NormalizedName = OriginName.Normalize(trimmed);
        Height = height;
        Width = width;
    }

    public bool Contains(int row, int column) => row >= 1 && row <= Height && column >= 1 && column <= Width;

    public void EnsureContains(int row, int column)
    {
        if (!Contains(row, column))
            throw new DomainException(
                $"Das Fach Reihe {row}, Spalte {column} liegt außerhalb des Regals „{Name}“ ({Height} × {Width}).");
    }
}

/// <summary>An occupied slot: one bottle of a wine in a rack. Free slots are not stored.</summary>
public class RackSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RackId { get; set; }
    public Rack Rack { get; set; } = null!;
    public int Row { get; set; }
    public int Column { get; set; }
    public Guid WineId { get; set; }
    public Wine Wine { get; set; } = null!;
    public string OwnerId { get; set; } = string.Empty;
}
