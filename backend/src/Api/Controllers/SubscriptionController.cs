using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>Tenant-facing read-only view of the caller's OWN subscription/usage/entitlements — the
/// tenant admin billing view. Every action is scoped to the ambient ITenantContext.TenantId; there is
/// no id parameter anywhere in this controller, so there is no id to substitute for another tenant's
/// (see docs/SAAS_BILLING.md's security section). Plan changes are not self-service in this
/// milestone — GetPlan/GetEntitlements/GetUsage are read-only by design.</summary>
[Authorize]
[RequirePermission(Permissions.Subscription.View)]
[Route("api/v1/subscription")]
public class SubscriptionController : ApiControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ITenantEntitlementService _entitlementService;
    private readonly ITenantUsageService _usageService;
    private readonly ITenantContext _tenantContext;

    public SubscriptionController(
        ISubscriptionService subscriptionService, ITenantEntitlementService entitlementService,
        ITenantUsageService usageService, ITenantContext tenantContext)
    {
        _subscriptionService = subscriptionService;
        _entitlementService = entitlementService;
        _usageService = usageService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (_tenantContext.TenantId is not { } tenantId) return NotFound(new { title = "No organization context.", status = 404 });

        var result = await _subscriptionService.GetForTenantAsync(tenantId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage(CancellationToken ct)
    {
        if (_tenantContext.TenantId is not { } tenantId) return NotFound(new { title = "No organization context.", status = 404 });
        return Ok(ApiResponse.Ok(await _usageService.GetUsageAsync(tenantId, ct)));
    }

    [HttpGet("entitlements")]
    public async Task<IActionResult> GetEntitlements(CancellationToken ct)
    {
        if (_tenantContext.TenantId is not { } tenantId) return NotFound(new { title = "No organization context.", status = 404 });
        return Ok(ApiResponse.Ok(await _entitlementService.GetEffectiveEntitlementsAsync(tenantId, ct)));
    }
}
