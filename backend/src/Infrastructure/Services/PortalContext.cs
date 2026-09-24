using Microsoft.AspNetCore.Http;
using RealEstateErp.Application.Common.Interfaces;

namespace RealEstateErp.Infrastructure.Services;

/// <summary>
/// Resolved once per request (scoped), only ever populated for a request carrying "token_use" =
/// "portal" (enforced separately by the PortalOnly authorization policy — this class doesn't gate
/// anything itself, it just reads claims a non-portal token never has).
/// </summary>
public class PortalContext : IPortalContext
{
    public PortalContext(IHttpContextAccessor accessor)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated == true && user.HasClaim("token_use", "portal"))
        {
            var subClaim = user.FindFirst("sub")?.Value ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            PortalUserId = string.IsNullOrEmpty(subClaim) ? Guid.Empty : Guid.Parse(subClaim);
            ActorType = user.FindFirst("portal_actor_type")?.Value ?? "";
            var actorIdClaim = user.FindFirst("portal_actor_id")?.Value;
            ActorId = string.IsNullOrEmpty(actorIdClaim) ? Guid.Empty : Guid.Parse(actorIdClaim);
        }
    }

    public Guid PortalUserId { get; }
    public string ActorType { get; } = "";
    public Guid ActorId { get; }
}
