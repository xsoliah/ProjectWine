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

    /// <summary>Distance of the left edge of the footprint from the left wall in cm; null = not placed in the room.</summary>
    public int? PosX { get; private set; }

    /// <summary>Distance of the back edge of the footprint from the back wall in cm.</summary>
    public int? PosZ { get; private set; }

    /// <summary>Quarter turns clockwise (0-3); 0 = the front faces the front wall.</summary>
    public int? Rotation { get; private set; }

    /// <summary>Height of the rack above the floor in cm (0 = on the floor); only meaningful when placed.</summary>
    public int ElevationCm { get; private set; }

    public List<RackSlot> Slots { get; } = [];

    public int Capacity => Height * Width;

    public bool IsPlaced => PosX.HasValue && PosZ.HasValue && Rotation.HasValue;

    /// <summary>The floor area the rack occupies in the room (null when not placed).</summary>
    public Footprint? CurrentFootprint => IsPlaced ? FootprintAt(PosX!.Value, PosZ!.Value, Rotation!.Value) : null;

    /// <summary>The floor area for the given position and rotation, using the current size.</summary>
    public Footprint FootprintAt(int x, int z, int rotation)
    {
        var w = Width * CellarRoom.CellCm;
        var d = CellarRoom.RackDepthCm;
        return rotation % 2 == 0 ? new Footprint(x, z, w, d) : new Footprint(x, z, d, w);
    }

    public void Place(int x, int z, int rotation, int elevationCm = 0)
    {
        if (rotation is < 0 or > 3) throw new DomainException("Die Drehung muss 0°, 90°, 180° oder 270° betragen.");
        if (x is < 0 or > CellarRoom.MaxSizeCm || z is < 0 or > CellarRoom.MaxSizeCm)
            throw new DomainException("Die Position liegt außerhalb des zulässigen Bereichs.");
        if (elevationCm is < 0 or > CellarRoom.MaxElevationCm)
            throw new DomainException($"Die Höhe über dem Boden muss zwischen 0 und {CellarRoom.MaxElevationCm} cm liegen.");
        ElevationCm = elevationCm;
        PosX = x;
        PosZ = z;
        Rotation = rotation;
    }

    public void ClearPlacement()
    {
        PosX = null;
        PosZ = null;
        Rotation = null;
        ElevationCm = 0;
    }

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
