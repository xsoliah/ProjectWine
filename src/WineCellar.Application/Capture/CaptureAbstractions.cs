using WineCellar.Domain;

namespace WineCellar.Application.Capture;

/// <summary>A photo handed to the research agent.</summary>
public sealed record ResearchImage(byte[] Data, string ContentType);

/// <summary>Reads the label photos and researches the wine on the web (implemented with Claude in Infrastructure).</summary>
public interface IWineResearchAgent
{
    /// <param name="hint">Optional note of the user, passed as a hint (not as an instruction).</param>
    /// <exception cref="WineResearchException">The research failed; <see cref="WineResearchException.IsTransient"/> tells whether a retry may help.</exception>
    /// <param name="knownBarcode">Barcode already known from the user's device (valid check digit), or null.</param>
    /// <param name="bottleOnly">Only the bottle outline and label corners matter (detecting the bottle of an existing wine): no web research.</param>
    Task<WineResearchResult> ResearchAsync(IReadOnlyList<ResearchImage> images, string? hint, string? knownBarcode, CancellationToken ct, bool bottleOnly = false);
}

public class WineResearchException(string message, bool isTransient, Exception? inner = null) : Exception(message, inner)
{
    /// <summary>Overload, rate limit, server error, network problem or timeout: worth retrying.</summary>
    public bool IsTransient { get; } = isTransient;
}

/// <summary>Cuts the label out of a photo: perspective correction and the standard portrait format.</summary>
public interface ILabelImageExtractor
{
    /// <summary>Returns the extracted label as JPEG (<see cref="LabelImageFormat.Width"/> x <see cref="LabelImageFormat.Height"/>).</summary>
    /// <exception cref="DomainException">The photo cannot be read.</exception>
    byte[] Extract(byte[] photo, LabelCorners corners);
}

public static class LabelImageFormat
{
    public const int Width = 900;
    public const int Height = 1200;
    public const string ContentType = "image/jpeg";
}

/// <summary>Whether photo capture can be used (an API key for the AI service is configured).</summary>
public interface ICaptureAvailability
{
    bool IsEnabled { get; }
}

/// <summary>Wakes the background worker when there is new work.</summary>
public interface ICaptureQueue
{
    void Notify();
}

public class PhotoCaptureOptions
{
    public const string Section = "PhotoCapture";

    public int DailyLimitPerUser { get; set; } = 20;
    public int MaxParallel { get; set; } = 2;
    public TimeSpan AttemptTimeout { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>Pauses before the automatic retries of transient errors (two retries: 10 s, 30 s).</summary>
    public TimeSpan[] RetryDelays { get; set; } = [TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30)];
}

public class ServiceUnavailableException(string message) : Exception(message);

public class QuotaExceededException(string message) : Exception(message);

// ----- Research result -----

public enum FieldSource
{
    Label,
    Web
}

public sealed record Researched<T>(T Value, FieldSource Source);

public sealed record ResearchedGrape(string Name, int? Percent, FieldSource Source);

public sealed record WebSource(string Title, string Url);

/// <summary>What the agent found. Empty (null) fields could not be determined; nothing is guessed.</summary>
public sealed record WineResearchResult
{
    public bool IsWineLabel { get; init; } = true;
    public string? Summary { get; init; }
    public Researched<string>? Name { get; init; }
    public Researched<string>? Producer { get; init; }
    public Researched<int>? Vintage { get; init; }
    public Researched<WineType>? Type { get; init; }
    public Researched<string>? Country { get; init; }
    public Researched<string>? Region { get; init; }
    public Researched<int>? BottleSizeMl { get; init; }
    public Researched<int>? DrinkFrom { get; init; }
    public Researched<int>? DrinkUntil { get; init; }
    public Researched<string>? Barcode { get; init; }
    public Researched<string>? Notes { get; init; }
    public IReadOnlyList<ResearchedGrape> Grapes { get; init; } = [];

    /// <summary>Corners of the front label on the first photo, or null when not reliably detected.</summary>
    public LabelCorners? LabelCorners { get; init; }

    /// <summary>Silhouette of the whole bottle on the first photo, or null when there is none.</summary>
    public BottleDetection? Bottle { get; init; }

    /// <summary>Collected from the web tool results (never written by the model).</summary>
    public IReadOnlyList<WebSource> Sources { get; init; } = [];
}
