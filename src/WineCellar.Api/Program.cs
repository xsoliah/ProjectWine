using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using WineCellar.Api;
using WineCellar.Api.Endpoints;
using WineCellar.Application;
using WineCellar.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

// Authentication: ASP.NET Core Identity API endpoints with bearer tokens (works for web and mobile).
builder.Services.AddAuthentication().AddBearerToken(IdentityConstants.BearerScheme);
builder.Services.AddAuthorization();
builder.Services
    .AddIdentityCore<AppUser>(o => o.User.RequireUniqueEmail = true)
    .AddEntityFrameworkStores<AppDbContext>()
    .AddApiEndpoints();

// Enums travel as strings ("Red", "Drunk", ...), which is easier to read and to consume in Angular.
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

// CORS is needed for the dev server and the Capacitor apps (they call the API cross-origin).
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddOpenApi();

var app = builder.Build();

await app.Services.InitializeDatabaseAsync();

app.UseExceptionHandler();
app.UseCors();

if (!builder.Configuration.GetValue("Auth:AllowRegistration", true))
{
    app.Use(async (context, next) =>
    {
        if (HttpMethods.IsPost(context.Request.Method) &&
            context.Request.Path.Equals("/api/auth/register", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
        await next();
    });
}

// The Angular app is published into wwwroot and served by this same site (one IIS site, no CORS for the web UI).
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseActiveUserValidation();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGroup("/api/auth").MapIdentityApi<AppUser>().WithTags("Auth");
app.MapWineEndpoints();
app.MapArchiveEndpoints();
app.MapOriginEndpoints();
app.MapGrapeEndpoints();
app.MapStatisticsEndpoints();
app.MapRackEndpoints();
app.MapCellarRoomEndpoints();
app.MapCaptureEndpoints();

// Angular client-side routing: everything that is not an API call falls back to index.html.
app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html");

app.Run();

// Makes the entry point visible to WebApplicationFactory-based tests.
public partial class Program;
