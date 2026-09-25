using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin management of tenant organizations across the whole platform. Subscription/
/// usage/entitlement sub-resources live here too (rather than a separate "PlatformTenantsController")
/// since they're all facets of the same tenant record — see docs/SAAS_BILLING.md.</summary>
[Route("api/v1/platform/organizations")]
public class PlatformOrganizationsController : PlatformControllerBase
{
    private readonly IOrganizationService _organizationService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly ITenantUsageService _usageService;
    private readonly ITenantEntitlementService _entitlementService;

    public PlatformOrganizationsController(
        IOrganizationService organizationService, ISubscriptionService subscriptionService,
        ITenantUsageService usageService, ITenantEntitlementService entitlementService,
        ITenantContext tenantContext) : base(tenantContext)
    {
        _organizationService = organizationService;
        _subscriptionService = subscriptionService;
        _usageService = usageService;
        _entitlementService = entitlementService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] string? search, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _organizationService.ListAsync(request, search, ct)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _organizationService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrganizationRequest request, CancellationToken ct)
    {
        var result = await _organizationService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateOrganizationStatusRequest request, CancellationToken ct)
    {
        var result = await _organizationService.UpdateStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpGet("{id:guid}/subscription")]
    public async Task<IActionResult> GetSubscription(Guid id, CancellationToken ct)
    {
        var result = await _subscriptionService.GetForTenantAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/subscription")]
    public async Task<IActionResult> AssignPlan(Guid id, AssignPlanRequest request, CancellationToken ct)
    {
        var result = await _subscriptionService.CreateAsync(new CreateSubscriptionRequest(id, request.PlanId, request.SkipTrial), ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/usage")]
    public async Task<IActionResult> GetUsage(Guid id, CancellationToken ct) => Ok(ApiResponse.Ok(await _usageService.GetUsageAsync(id, ct)));

    [HttpGet("{id:guid}/entitlements")]
    public async Task<IActionResult> GetEntitlements(Guid id, CancellationToken ct)
    {
        var effective = await _entitlementService.GetEffectiveEntitlementsAsync(id, ct);
        var overrides = await _entitlementService.ListOverridesAsync(id, ct);
        return Ok(ApiResponse.Ok(new { effective, overrides }));
    }

    [HttpPut("{id:guid}/entitlements")]
    public async Task<IActionResult> SetEntitlementOverride(Guid id, SetTenantEntitlementOverrideRequest request, CancellationToken ct)
    {
        await _entitlementService.SetOverrideAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}/entitlements/{code}")]
    public async Task<IActionResult> RemoveEntitlementOverride(Guid id, string code, CancellationToken ct)
    {
        await _entitlementService.RemoveOverrideAsync(id, code, ct);
        return NoContent();
    }
}

public record AssignPlanRequest(Guid PlanId, bool SkipTrial);
