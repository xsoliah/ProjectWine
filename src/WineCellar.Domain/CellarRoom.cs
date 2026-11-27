namespace WineCellar.Domain;

/// <summary>A floor rectangle in cm: min corner (X from the left wall, Z from the back wall) and size.</summary>
public readonly record struct Footprint(int X, int Z, int Width, int Depth)
{
    public int Right => X + Width;
    public int Front => Z + Depth;

    /// <summary>True when the areas share more than an edge (touching is allowed).</summary>
    public bool Overlaps(Footprint other) =>
        X < other.Right && other.X < Right && Z < other.Front && other.Z < Front;

    public bool IsInside(int roomWidthCm, int roomDepthCm) =>
        X >= 0 && Z >= 0 && Right <= roomWidthCm && Front <= roomDepthCm;
}

/// <summary>A user's cellar room: a rectangle with a ceiling height, in cm. One per user.</summary>
public class CellarRoom
{
    public const int CellCm = 12;
    public const int RackDepthCm = 38;
    public const int MinSizeCm = 100;
    public const int MaxSizeCm = 2000;
    public const int MinHeightCm = 150;
    public const int MaxHeightCm = 500;
    public const int DefaultWidthCm = 400;
    public const int DefaultDepthCm = 300;
    public const int DefaultHeightCm = 250;

    public string OwnerId { get; set; } = string.Empty;
    public int WidthCm { get; private set; } = DefaultWidthCm;
    public int DepthCm { get; private set; } = DefaultDepthCm;
    public int HeightCm { get; private set; } = DefaultHeightCm;

    public void Set(int widthCm, int depthCm, int heightCm)
    {
        if (widthCm is < MinSizeCm or > MaxSizeCm)
            throw new DomainException("Die Breite des Raums muss zwischen 1 und 20 m liegen.");
        if (depthCm is < MinSizeCm or > MaxSizeCm)
            throw new DomainException("Die Tiefe des Raums muss zwischen 1 und 20 m liegen.");
        if (heightCm is < MinHeightCm or > MaxHeightCm)
            throw new DomainException("Die Deckenhöhe muss zwischen 1,5 und 5 m liegen.");
        WidthCm = widthCm;
        DepthCm = depthCm;
        HeightCm = heightCm;
    }

    /// <summary>
    /// Checks that <paramref name="rack"/> fits at the given spot: inside the room and not overlapping any other placed rack.
    /// Returns an error text or null.
    /// </summary>
    public static string? CheckFit(int roomWidthCm, int roomDepthCm, Rack rack, Footprint footprint, IEnumerable<Rack> others)
    {
        if (!footprint.IsInside(roomWidthCm, roomDepthCm))
            return $"Das Regal „{rack.Name}“ würde über den Raum ({roomWidthCm} × {roomDepthCm} cm) hinausragen.";
        var clash = others.FirstOrDefault(o => o.Id != rack.Id && o.CurrentFootprint is { } f && f.Overlaps(footprint));
        return clash is null ? null : $"Das Regal „{rack.Name}“ würde das Regal „{clash.Name}“ überlappen.";
    }
}
