using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WineCellar.Application;
using WineCellar.Application.Services;
using WineCellar.Domain;

namespace WineCellar.Api.Endpoints;

/// <summary>Photo capture drafts, protected images and the label image of a wine.</summary>
public static class CaptureEndpoints
{
    /// <summary>Two photos of at most 10 MB each plus form fields.</summary>
    private const long MaxUploadBytes = 2 * StoredImage.MaxBytes + 1024 * 1024;

    public static IEndpointRouteBuilder MapCaptureEndpoints(this IEndpointRouteBuilder app)
    {
        var captures = app.MapGroup("/api/captures").RequireAuthorization().WithTags("Captures");

        // Limit, used, remaining today, and whether photo capture is available at all.
        captures.MapGet("quota", async (CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.GetQuotaAsync(ct)));

        // Finished drafts not taken over yet (navigation badge) and all drafts.
        captures.MapGet("counts", async (CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.CountAsync(ct)));

        // Multipart: front (required), back (optional), bottleCount, note. Answers immediately with a waiting draft.
        captures.MapPost("", async (HttpRequest request, CaptureService service, CancellationToken ct) =>
            {
                if (!request.HasFormContentType) throw new DomainException("Bitte die Fotos als multipart/form-data senden.");
                var form = await request.ReadFormAsync(ct);
                var front = await ReadAsync(form.Files.GetFile("front"), ct);
                var back = await ReadAsync(form.Files.GetFile("back"), ct);
                var count = int.TryParse(form["bottleCount"], out var c) ? c : 1;
                var draft = await service.CreateAsync(front, back, count, form["note"], form["barcode"], ct);
                return TypedResults.Accepted($"/api/captures/{draft.Id}", draft);
            })
            .WithMetadata(new RequestSizeLimitAttribute(MaxUploadBytes))
            .DisableAntiforgery();

        captures.MapGet("", async (CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.ListAsync(ct)));

        // Draft with result, sources and matching (own country/region/grapes, existing wine).
        captures.MapGet("{id:guid}", async (Guid id, CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.GetAsync(id, ct)));

        // Research again; counts towards the daily limit.
        captures.MapPost("{id:guid}/retry", async (Guid id, CaptureService service, CancellationToken ct) =>
        {
            var draft = await service.RetryAsync(id, ct);
            return TypedResults.Accepted($"/api/captures/{draft.Id}", draft);
        });

        // Adjust the label corners of a finished draft (cuts the preview again; no research, no quota).
        captures.MapPut("{id:guid}/label-corners", async (Guid id, SetLabelCornersRequest request, CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.SetLabelCornersAsync(id, request.Corners, ct)));

        // Adjust outline and/or label placement of the bottle of a finished draft (no research, no quota).
        captures.MapPut("{id:guid}/bottle-shape", async (Guid id, SetBottleShapeRequest request, CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.SetBottleShapeAsync(id, request, ct)));

        // { wineId } after creating the wine from the form, or { addToWineId, count } for an existing wine.
        captures.MapPost("{id:guid}/accept", async (Guid id, AcceptCaptureRequest request, CaptureService service, CancellationToken ct) =>
            TypedResults.Ok(await service.AcceptAsync(id, request, ct)));

        captures.MapDelete("{id:guid}", async (Guid id, CaptureService service, CancellationToken ct) =>
        {
            await service.DiscardAsync(id, ct);
            return TypedResults.NoContent();
        });

        // Images are only delivered to their owner; <img src> cannot send the bearer token, the app loads them as blobs.
        app.MapGet("/api/images/{id:guid}", async (Guid id, ImageService images, HttpContext http, CancellationToken ct) =>
            {
                var image = await images.GetAsync(id, ct);
                http.Response.Headers.CacheControl = "private, max-age=86400";
                return TypedResults.File(image.Data, image.ContentType);
            })
            .RequireAuthorization()
            .WithTags("Images");

        var label = app.MapGroup("/api/wines/{id:guid}/label-image").RequireAuthorization().WithTags("Wines");

        // Multipart: image (photo) + corners (JSON array of four {x, y}, normalized 0..1). The server cuts the label.
        label.MapPut("", async (Guid id, HttpRequest request, LabelImageService service, CancellationToken ct) =>
            {
                if (!request.HasFormContentType) throw new DomainException("Bitte das Foto als multipart/form-data senden.");
                var form = await request.ReadFormAsync(ct);
                var photo = await ReadAsync(form.Files.GetFile("image"), ct)
                            ?? throw new DomainException("Bitte ein Foto auswählen.");
                return TypedResults.Ok(await service.SetAsync(id, photo, ParseCorners(form["corners"]), ct));
            })
            .WithMetadata(new RequestSizeLimitAttribute(MaxUploadBytes))
            .DisableAntiforgery();

        // Cut the label again from the stored original photo.
        label.MapPut("corners", async (Guid id, SetLabelCornersRequest request, LabelImageService service, CancellationToken ct) =>
            TypedResults.Ok(await service.SetCornersAsync(id, request.Corners, ct)));

        label.MapDelete("", async (Guid id, LabelImageService service, CancellationToken ct) =>
            TypedResults.Ok(await service.RemoveAsync(id, ct)));

        var back = app.MapGroup("/api/wines/{id:guid}/back-image").RequireAuthorization().WithTags("Wines");

        // Multipart: image (the whole back label photo, stored unedited).
        back.MapPut("", async (Guid id, HttpRequest request, BackImageService service, CancellationToken ct) =>
            {
                if (!request.HasFormContentType) throw new DomainException("Bitte das Foto als multipart/form-data senden.");
                var form = await request.ReadFormAsync(ct);
                var photo = await ReadAsync(form.Files.GetFile("image"), ct)
                            ?? throw new DomainException("Bitte ein Foto auswählen.");
                return TypedResults.Ok(await service.SetAsync(id, photo, ct));
            })
            .WithMetadata(new RequestSizeLimitAttribute(MaxUploadBytes))
            .DisableAntiforgery();

        back.MapDelete("", async (Guid id, BackImageService service, CancellationToken ct) =>
            TypedResults.Ok(await service.RemoveAsync(id, ct)));

        var bottle = app.MapGroup("/api/wines/{id:guid}/bottle-shape").RequireAuthorization().WithTags("Wines");

        // Adjust outline and/or label placement (no research, no quota).
        bottle.MapPut("", async (Guid id, SetBottleShapeRequest request, BottleShapeService service, CancellationToken ct) =>
            TypedResults.Ok(await service.SetAsync(id, request, ct)));

        // Detect the bottle on the stored original photo: one research, counts towards the daily limit.
        bottle.MapPost("detect", async (Guid id, BottleShapeService service, CancellationToken ct) =>
            TypedResults.Ok(await service.DetectAsync(id, ct)));

        return app;
    }

    private static async Task<byte[]?> ReadAsync(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return null;
        if (file.Length > StoredImage.MaxBytes) throw new DomainException("Das Bild ist größer als 10 MB.");
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        return stream.ToArray();
    }

    private static IReadOnlyList<LabelPointDto>? ParseCorners(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<LabelPointDto>>(json, JsonSerializerOptions.Web);
        }
        catch (JsonException)
        {
            throw new DomainException("Die Ecken des Etiketts konnten nicht gelesen werden.");
        }
    }
}
