using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.Api.Controllers.Portal;

/// <summary>
/// The push device-registration endpoint for any External Portal actor type — mirrors
/// PortalLocalizationController's shape exactly (not one of the actor-specific controllers under
/// PortalControllerBase, since every portal actor needs the identical capability, keyed by
/// IPortalContext.PortalUserId, not by which actor type is calling). See
/// IDeviceRegistrationService's doc comment for why this only stores a token and never sends a push.
/// </summary>
[RequirePortal]
[RequireEntitlement(EntitlementCodes.ExternalPortals)]
[Route("api/v1/portal/device-tokens")]
public class PortalDeviceRegistrationController : ApiControllerBase
{
    private readonly IDeviceRegistrationService _deviceRegistrationService;
    private readonly IPortalContext _portalContext;

    public PortalDeviceRegistrationController(IDeviceRegistrationService deviceRegistrationService, IPortalContext portalContext)
    {
        _deviceRegistrationService = deviceRegistrationService;
        _portalContext = portalContext;
    }

    [HttpPost]
    public async Task<IActionResult> Register(RegisterDeviceTokenRequest request, CancellationToken ct)
    {
        var result = await _deviceRegistrationService.RegisterAsync(_portalContext.PortalUserId, isPortalOwner: true, request, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
