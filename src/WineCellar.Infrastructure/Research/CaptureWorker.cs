using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WineCellar.Application.Capture;

namespace WineCellar.Infrastructure.Research;

/// <summary>Wake-up signal for the worker (new capture, retry, or a list request that found waiting drafts).</summary>
public sealed class CaptureQueue : ICaptureQueue
{
    private readonly Channel<bool> _signal = Channel.CreateBounded<bool>(new BoundedChannelOptions(1)
    {
        FullMode = BoundedChannelFullMode.DropWrite,
    });

    public void Notify() => _signal.Writer.TryWrite(true);

    /// <summary>Waits for a signal or the timeout, whichever comes first.</summary>
    public async Task WaitAsync(TimeSpan timeout, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(timeout);
        try
        {
            await _signal.Reader.WaitToReadAsync(cts.Token);
            _signal.Reader.TryRead(out _);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            // periodic check
        }
    }
}

public sealed class CaptureAvailability(IOptions<AnthropicOptions> options) : ICaptureAvailability
{
    public bool IsEnabled => !string.IsNullOrWhiteSpace(options.Value.ApiKey);
}

/// <summary>
/// Background service that researches waiting drafts, independent of whether the app stays open. Wakes up on a
/// signal and every 30 seconds, runs at most <see cref="PhotoCaptureOptions.MaxParallel"/> researches at a time and
/// restarts drafts interrupted by a server restart. Only registered when an API key is configured.
/// </summary>
public sealed class CaptureWorker(
    IServiceScopeFactory scopes,
    CaptureQueue queue,
    IOptions<PhotoCaptureOptions> options,
    ILogger<CaptureWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunScopedAsync(async p =>
        {
            var reset = await p.ResetInterruptedAsync(stoppingToken);
            if (reset > 0) logger.LogInformation("Restarting {Count} interrupted capture research(es)", reset);
        });

        using var slots = new SemaphoreSlim(Math.Max(1, options.Value.MaxParallel));
        while (!stoppingToken.IsCancellationRequested)
        {
            while (slots.CurrentCount > 0 && !stoppingToken.IsCancellationRequested)
            {
                Guid? id = null;
                await RunScopedAsync(async p => id = await p.ClaimNextAsync(stoppingToken));
                if (id is not { } draftId) break;

                await slots.WaitAsync(stoppingToken);
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await RunScopedAsync(p => p.ProcessAsync(draftId, stoppingToken));
                    }
                    finally
                    {
                        slots.Release();
                        queue.Notify(); // a slot is free again: look for more work
                    }
                }, CancellationToken.None);
            }
            await queue.WaitAsync(PollInterval, stoppingToken);
        }
    }

    private async Task RunScopedAsync(Func<CaptureProcessor, Task> action)
    {
        try
        {
            using var scope = scopes.CreateScope();
            await action(scope.ServiceProvider.GetRequiredService<CaptureProcessor>());
        }
        catch (OperationCanceledException)
        {
            // shutting down
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Capture worker step failed");
        }
    }
}
