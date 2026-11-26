using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using WineCellar.Application.Services;

namespace WineCellar.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<WineService>();
        services.AddScoped<ArchiveService>();
        services.AddScoped<OriginService>();
        services.AddScoped<GrapeService>();
        services.AddScoped<StatisticsService>();
        services.AddScoped<RackService>();
        services.AddScoped<ImageService>();
        services.AddScoped<LabelImageService>();
        services.AddScoped<CaptureService>();
        services.AddScoped<BottleShapeService>();
        services.AddScoped<Capture.BottleAnalyzer>();
        services.AddScoped<Capture.CaptureProcessor>();
        return services;
    }
}
