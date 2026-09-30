using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.Api.Controllers.Portal;

/// <summary>
/// Read-only tenant locale profile (currency/locale/date format/etc.) for any External Portal actor
/// type — deliberately NOT one of the actor-specific controllers under `PortalControllerBase`, since
/// every portal actor (Customer/Tenant/Owner/Vendor/Member) needs the same non-sensitive data to
/// render amounts in the tenant's real currency instead of assuming USD (Milestone 17 fix — portal
/// sessions have no RBAC permissions, so they can never reach the staff-only
/// `GET /localization/current`). Reuses the existing ILocalizationService exactly as the internal
/// endpoint does; ITenantContext.TenantId is populated for a portal request the same as any other.
/// </summary>
[RequirePortal]
[RequireEntitlement(EntitlementCodes.ExternalPortals)]
[Route("api/v1/portal/localization")]
public class PortalLocalizationController : ApiControllerBase
{
    private readonly ILocalizationService _localizationService;

    public PortalLocalizationController(ILocalizationService localizationService)
    {
        _localizationService = localizationService;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await _localizationService.GetCurrentAsync(ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
