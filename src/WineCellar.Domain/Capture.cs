namespace WineCellar.Domain;

/// <summary>An image uploaded by a user (capture photo, original label photo or extracted label image).</summary>
public class StoredImage
{
    public const int MaxBytes = 10 * 1024 * 1024;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/jpeg";
    public byte[] Data { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum CaptureStatus
{
    /// <summary>Waiting for the background research.</summary>
    Pending,
    Researching,
    Ready,
    Failed
}

/// <summary>A photo capture: the photos, the research result and its state until it becomes a wine.</summary>
public class CaptureDraft
{
    public const int MaxNoteLength = 500;

    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public CaptureStatus Status { get; set; } = CaptureStatus.Pending;
    public Guid FrontImageId { get; set; }
    public Guid? BackImageId { get; set; }
    public int BottleCount { get; set; } = 1;
    public string? UserNote { get; set; }

    /// <summary>Validated research result (JSON of the application's result type).</summary>
    public string? ResultJson { get; set; }

    /// <summary>Web sources (JSON list of title/url) collected from the tool results, never written by the model.</summary>
    public string? SourcesJson { get; set; }

    /// <summary>Label corners on the front photo (JSON), from the agent or adjusted by the user.</summary>
    public string? LabelCornersJson { get; set; }

    /// <summary>Label extracted from the front photo with the current corners (standard format).</summary>
    public Guid? LabelPreviewImageId { get; set; }

    public string? Error { get; set; }
    public int Attempts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>Optimistic concurrency token: changed on every status change so two workers cannot claim the same draft.</summary>
    public Guid Version { get; set; } = Guid.NewGuid();

    public void Touch() => Version = Guid.NewGuid();
}

/// <summary>How many researches a user started on a day (daily limit).</summary>
public class CaptureUsage
{
    public string OwnerId { get; set; } = string.Empty;
    public DateOnly Day { get; set; }
    public int Count { get; set; }
}

public readonly record struct LabelPoint(double X, double Y);

/// <summary>
/// The four corners of a label on a photo, normalized to 0..1 (top left, top right, bottom right, bottom left).
/// </summary>
public sealed record LabelCorners(LabelPoint TopLeft, LabelPoint TopRight, LabelPoint BottomRight, LabelPoint BottomLeft)
{
    /// <summary>Minimum share of the photo the label must cover to be plausible.</summary>
    public const double MinArea = 0.02;

    [System.Text.Json.Serialization.JsonIgnore]
    public IReadOnlyList<LabelPoint> Points => [TopLeft, TopRight, BottomRight, BottomLeft];

    /// <summary>Coordinates rounded to 4 decimals (finer than a pixel at 1568 px); keeps the stored JSON short.</summary>
    public LabelCorners Rounded()
    {
        static LabelPoint R(LabelPoint p) => new(Math.Round(p.X, 4), Math.Round(p.Y, 4));
        return new LabelCorners(R(TopLeft), R(TopRight), R(BottomRight), R(BottomLeft));
    }

    /// <summary>Default suggestion when no corners are known: a frame 10 % inside every edge.</summary>
    public static LabelCorners Centered { get; } =
        new(new(0.1, 0.1), new(0.9, 0.1), new(0.9, 0.9), new(0.1, 0.9));

    /// <summary>Inside the photo, convex, in clockwise order and large enough.</summary>
    public bool IsPlausible()
    {
        var p = Points;
        if (p.Any(q => double.IsNaN(q.X) || double.IsNaN(q.Y) || q.X < 0 || q.X > 1 || q.Y < 0 || q.Y > 1))
            return false;

        // Convex and consistently ordered: all cross products of consecutive edges have the same sign
        // (positive = clockwise in image coordinates, where y points down).
        for (var i = 0; i < 4; i++)
        {
            var a = p[i];
            var b = p[(i + 1) % 4];
            var c = p[(i + 2) % 4];
            var cross = (b.X - a.X) * (c.Y - b.Y) - (b.Y - a.Y) * (c.X - b.X);
            if (cross <= 0) return false;
        }
        return Area() >= MinArea;
    }

    /// <summary>Shoelace formula.</summary>
    public double Area()
    {
        var p = Points;
        double sum = 0;
        for (var i = 0; i < 4; i++) sum += p[i].X * p[(i + 1) % 4].Y - p[(i + 1) % 4].X * p[i].Y;
        return Math.Abs(sum) / 2;
    }

    public void EnsurePlausible()
    {
        if (!IsPlausible())
            throw new DomainException(
                "Die Ecken des Etiketts sind ungültig: Sie müssen im Bild liegen, ein Viereck im Uhrzeigersinn bilden " +
                "(oben links, oben rechts, unten rechts, unten links) und mindestens 2 % des Bildes umfassen.");
    }
}
