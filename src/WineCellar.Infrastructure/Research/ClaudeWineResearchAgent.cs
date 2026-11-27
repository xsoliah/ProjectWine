using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Beta.Messages;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WineCellar.Application.Capture;

namespace WineCellar.Infrastructure.Research;

public class AnthropicOptions
{
    public const string Section = "Anthropic";

    /// <summary>Never in appsettings.json: user secrets locally, environment variable Anthropic__ApiKey on the server.</summary>
    public string? ApiKey { get; set; }
    public string Model { get; set; } = "claude-haiku-5-5";
    public string Effort { get; set; } = "medium";
    public int MaxTokens { get; set; } = 16000;
    public int MaxContinuations { get; set; } = 3;
}

/// <summary>
/// Reads the label photos and researches the wine with Claude: one Messages API request with the server tools
/// web search and web fetch (run by Anthropic, nothing is executed here), adaptive thinking and a JSON schema for the
/// answer. Sources are taken from the tool result blocks, so they cannot be made up by the model.
/// </summary>
public class ClaudeWineResearchAgent(IOptions<AnthropicOptions> options, ILogger<ClaudeWineResearchAgent> logger) : IWineResearchAgent
{
    private const string FallbackBeta = "server-side-fallback-2026-07-01";

    private readonly AnthropicClient _client = new()
    {
        ApiKey = options.Value.ApiKey,
        // Retries are handled in one place: CaptureProcessor (2 retries, 10 s / 30 s).
        MaxRetries = 0,
        Timeout = TimeSpan.FromMinutes(5),
    };

    public async Task<WineResearchResult> ResearchAsync(IReadOnlyList<ResearchImage> images, string? hint, string? knownBarcode, CancellationToken ct, bool bottleOnly = false, bool curveOnly = false)
    {
        var settings = options.Value;
        var userContent = new List<BetaContentBlockParam>();
        for (var i = 0; i < images.Count; i++)
        {
            userContent.Add(new BetaTextBlockParam { Text = i == 0 ? "Photo 1 (front label):" : $"Photo {i + 1} (e.g. back label):" });
            userContent.Add(new BetaImageBlockParam
            {
                Source = new BetaBase64ImageSource
                {
                    Data = Convert.ToBase64String(images[i].Data),
                    MediaType = images[i].ContentType switch
                    {
                        "image/png" => MediaType.ImagePng,
                        "image/webp" => MediaType.ImageWebP,
                        _ => MediaType.ImageJpeg,
                    },
                },
            });
        }
        userContent.Add(new BetaTextBlockParam { Text = ResearchPrompt.UserInstruction(hint, knownBarcode, bottleOnly, curveOnly) });

        List<BetaMessageParam> messages = [new BetaUserMessageParam { Content = userContent }];
        var collected = new List<BetaContentBlock>();

        for (var turn = 0; ; turn++)
        {
            BetaMessage response;
            try
            {
                // Haiku: basic web tool variants and no server-side refusal fallback (not offered for Haiku 5.5).
                var isHaiku = settings.Model.StartsWith("claude-haiku", StringComparison.OrdinalIgnoreCase);
                var request = new MessageCreateParams
                {
                    Model = settings.Model,
                    MaxTokens = settings.MaxTokens,
                    Thinking = new BetaThinkingConfigAdaptive(),
                    // No output_config.format: the strict schema is rejected as "compiled grammar too large".
                    // The JSON shape is described in the system prompt and validated by ResearchResponseReader.
                    OutputConfig = new BetaOutputConfig { Effort = ResearchPrompt.ParseEffort(settings.Effort) },
                    System = ResearchPrompt.System + ResearchSchema.PromptSection,
                    Tools = isHaiku
                        ?
                        [
                            new BetaToolUnion(new BetaWebSearchTool20250305 { MaxUses = 5 }),
                            new BetaToolUnion(new BetaWebFetchTool20250910 { MaxUses = 3 }),
                        ]
                        :
                        [
                            new BetaToolUnion(new BetaWebSearchTool20260209 { MaxUses = 5 }),
                            new BetaToolUnion(new BetaWebFetchTool20260209 { MaxUses = 3 }),
                        ],
                    Messages = messages,
                };
                if (!isHaiku) request = request with { Betas = [FallbackBeta], Fallbacks = new Default() };
                response = await _client.Beta.Messages.Create(request, cancellationToken: ct);
            }
            catch (AnthropicRateLimitException ex)
            {
                throw new WineResearchException("Der KI-Dienst ist gerade ausgelastet (Ratenlimit).", isTransient: true, ex);
            }
            catch (Anthropic5xxException ex)
            {
                throw new WineResearchException("Der KI-Dienst ist vorübergehend nicht erreichbar.", isTransient: true, ex);
            }
            catch (AnthropicApiException ex) when (IsTransientStatus(ex))
            {
                throw new WineResearchException("Der KI-Dienst ist vorübergehend nicht erreichbar.", isTransient: true, ex);
            }
            catch (AnthropicApiException ex)
            {
                logger.LogError(ex, "Claude request rejected");
                throw new WineResearchException("Die Anfrage an den KI-Dienst wurde abgelehnt. Details stehen im Server-Log.", isTransient: false, ex);
            }
            catch (HttpRequestException ex)
            {
                throw new WineResearchException("Keine Verbindung zum KI-Dienst.", isTransient: true, ex);
            }

            collected.AddRange(response.Content);
            var stop = StopReasonOf(response);
            logger.LogInformation("Claude research turn {Turn}: stop={Stop}, model={Model}, in={In}, out={Out}, searches={Searches}, fetches={Fetches}",
                turn, stop, response.Model, response.Usage.InputTokens, response.Usage.OutputTokens,
                response.Usage.ServerToolUse?.WebSearchRequests ?? 0, response.Usage.ServerToolUse?.WebFetchRequests ?? 0);

            if (stop == "pause_turn" && turn < settings.MaxContinuations)
            {
                // The server-side tool loop paused: send the answer back unchanged and let the server resume.
                messages.Add(new BetaAssistantMessageParam
                {
                    Content = response.Content.Select(b => new BetaContentBlockParam(b.Json)).ToList(),
                });
                continue;
            }

            return ResearchResponseReader.Read(stop, collected.Select(b => b.Json));
        }
    }

    internal static string StopReasonOf(BetaMessage response) =>
        response.StopReason?.Raw() ?? "unknown";

    private static bool IsTransientStatus(AnthropicApiException ex) =>
        (int?)ex.StatusCode is 408 or 409 or 429 or 529 or >= 500;
}
