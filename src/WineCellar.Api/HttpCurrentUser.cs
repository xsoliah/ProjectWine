using System.Security.Claims;
using WineCellar.Application;

namespace WineCellar.Api;

public class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string UserId =>
        accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("No authenticated user in the current request.");
}
