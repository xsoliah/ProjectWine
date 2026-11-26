using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using WineCellar.Application;
using WineCellar.Application.Capture;

namespace WineCellar.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' is missing.");

        services.AddDbContext<AppDbContext>(o => o.UseSqlServer(connectionString));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Photo capture: options, label extraction and (only with an API key) the Claude agent and the worker.
        services.Configure<PhotoCaptureOptions>(configuration.GetSection(PhotoCaptureOptions.Section));
        services.Configure<Research.AnthropicOptions>(configuration.GetSection(Research.AnthropicOptions.Section));
        services.AddSingleton<ILabelImageExtractor, Imaging.SkiaLabelImageExtractor>();
        services.AddSingleton<Research.CaptureQueue>();
        services.AddSingleton<ICaptureQueue>(sp => sp.GetRequiredService<Research.CaptureQueue>());
        services.AddSingleton<ICaptureAvailability, Research.CaptureAvailability>();
        services.AddSingleton<IWineResearchAgent, Research.ClaudeWineResearchAgent>();
        if (!string.IsNullOrWhiteSpace(configuration[$"{Research.AnthropicOptions.Section}:ApiKey"]))
            services.AddHostedService<Research.CaptureWorker>();

        services.AddHttpClient<IBarcodeLookup, OpenFoodFactsBarcodeLookup>(client =>
        {
            client.BaseAddress = new Uri("https://world.openfoodfacts.org/");
            client.Timeout = TimeSpan.FromSeconds(8);
            // Open Food Facts asks API users to identify their app.
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WineCellar/1.0 (self-hosted)");
        });

        return services;
    }

    /// <summary>
    /// Applies migrations. As long as no migration has been generated yet, the schema is
    /// created directly so the app runs on first start (see README: generate "Initial").
    /// </summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseInitializer");

        if (db.Database.GetMigrations().Any())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            logger.LogWarning("No EF migrations found - creating the schema with EnsureCreated. Generate an initial migration before production use.");
            await db.Database.EnsureCreatedAsync();
        }
    }
}
