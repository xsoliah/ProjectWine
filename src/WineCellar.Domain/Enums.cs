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

/// <summary>Shape of the bottle in the 3D views. A wine without a form ("automatic") follows its type.</summary>
public enum BottleForm
{
    Bordeaux,
    Burgundy,
    Champagne,
    Flute
}

/// <summary>Why bottles left the cellar. Every kind ends up in the archive.</summary>
public enum ConsumptionKind
{
    Drunk,
    Sold,
    Gifted
}
