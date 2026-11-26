using Microsoft.AspNetCore.Identity;
using WineCellar.Infrastructure;

namespace WineCellar.Api;

/// <summary>
/// Bearer tokens are self-contained and stay cryptographically valid until they expire, even when
/// the user has been deleted or their security stamp changed (e.g. password reset). This middleware
/// checks every authenticated request against the user store and answers 401 for such tokens, so
/// the client's refresh attempt fails and it logs the user out.
/// </summary>
public static class ActiveUserValidation
{
    public static IApplicationBuilder UseActiveUserValidation(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var signInManager = context.RequestServices.GetRequiredService<SignInManager<AppUser>>();
                if (await signInManager.ValidateSecurityStampAsync(context.User) is null)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return;
                }
            }
            await next();
        });
}
