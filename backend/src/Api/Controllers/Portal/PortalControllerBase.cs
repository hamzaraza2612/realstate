using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Application.Common.Interfaces;

namespace RealEstateErp.Api.Controllers.Portal;

/// <summary>
/// Base for every actor-specific portal controller. [RequirePortal] (on each concrete controller)
/// already guarantees the caller holds a portal-issued token; this adds the second check that a
/// portal token for one actor type can't be pointed at another actor type's endpoints (a Vendor's
/// token is a valid portal token, but PortalContext.ActorType will be "Vendor", not "Customer" — a
/// PortalUser only ever has one ActorType by construction, but this makes it impossible for a future
/// routing mistake to rely on that alone).
/// </summary>
public abstract class PortalControllerBase : ApiControllerBase
{
    private readonly IPortalContext _portalContext;

    protected PortalControllerBase(IPortalContext portalContext)
    {
        _portalContext = portalContext;
    }

    protected abstract string RequiredActorType { get; }

    /// <summary>Call at the top of every action; if it returns true, return the out IActionResult immediately.</summary>
    protected bool WrongActorType(out IActionResult result)
    {
        if (_portalContext.ActorType != RequiredActorType)
        {
            result = StatusCode(403, new { title = "This portal account cannot access this area.", status = 403 });
            return true;
        }
        result = Ok();
        return false;
    }
}
