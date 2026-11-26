using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using WineCellar.Application;
using WineCellar.Application.Capture;
using WineCellar.Domain;

namespace WineCellar.Api;

/// <summary>Maps domain/application exceptions to RFC 7807 problem responses.</summary>
public class ApiExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        (int status, string? title) = exception switch
        {
            DomainException => (StatusCodes.Status400BadRequest, "Ungültige Eingabe"),
            NotFoundException => (StatusCodes.Status404NotFound, "Nicht gefunden"),
            ConflictException => (StatusCodes.Status409Conflict, "Konflikt"),
            QuotaExceededException => (StatusCodes.Status429TooManyRequests, "Tageslimit erreicht"),
            ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Nicht verfügbar"),
            _ => (0, null)
        };
        if (status == 0) return false;

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = exception.Message }
        });
    }
}
