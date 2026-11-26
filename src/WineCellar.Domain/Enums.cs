namespace WineCellar.Domain;

public enum WineType
{
    Red,
    White,
    Rose,
    Sparkling,
    Dessert,
    Fortified,
    Other
}

/// <summary>Why bottles left the cellar. Every kind ends up in the archive.</summary>
public enum ConsumptionKind
{
    Drunk,
    Sold,
    Gifted
}
