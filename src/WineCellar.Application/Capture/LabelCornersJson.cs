using System.Text.Json;
using System.Text.Json.Serialization;
using WineCellar.Domain;

namespace WineCellar.Application.Capture;

/// <summary>Conversions between stored JSON, DTOs and <see cref="LabelCorners"/>.</summary>
public static class LabelCornersJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public static string Serialize(LabelCorners corners) => JsonSerializer.Serialize(corners.Rounded(), Options);

    public static LabelCorners? Deserialize(string? json) =>
        string.IsNullOrEmpty(json) ? null : JsonSerializer.Deserialize<LabelCorners>(json, Options);

    public static IReadOnlyList<LabelPointDto> ToDto(LabelCorners corners) =>
        corners.Points.Select(p => new LabelPointDto(p.X, p.Y)).ToList();

    public static IReadOnlyList<LabelPointDto>? ToDto(string? json) =>
        Deserialize(json) is { } c ? ToDto(c) : null;

    /// <summary>Validates count and plausibility (inside the photo, convex, clockwise, at least 2 % of the area).</summary>
    public static LabelCorners FromDto(IReadOnlyList<LabelPointDto>? points)
    {
        if (points is null || points.Count != 4)
            throw new DomainException("Es müssen genau vier Ecken angegeben werden.");
        var corners = new LabelCorners(
            new(points[0].X, points[0].Y), new(points[1].X, points[1].Y),
            new(points[2].X, points[2].Y), new(points[3].X, points[3].Y));
        corners.EnsurePlausible();
        return corners;
    }
}
