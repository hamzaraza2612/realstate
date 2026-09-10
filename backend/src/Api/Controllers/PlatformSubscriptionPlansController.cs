using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin management of the plans sold to tenants.</summary>
[Route("api/v1/platform/subscription-plans")]
public class PlatformSubscriptionPlansController : PlatformControllerBase
{
    private readonly ISubscriptionPlanService _subscriptionPlanService;

    public PlatformSubscriptionPlansController(ISubscriptionPlanService subscriptionPlanService, ITenantContext tenantContext) : base(tenantContext)
    {
        _subscriptionPlanService = subscriptionPlanService;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse.Ok(await _subscriptionPlanService.ListAsync(ct)));

    [HttpPost]
    public async Task<IActionResult> Create(CreateSubscriptionPlanRequest request, CancellationToken ct)
    {
        var result = await _subscriptionPlanService.CreateAsync(request, ct);
        return Ok(ApiResponse.Ok(result.Value));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateSubscriptionPlanRequest request, CancellationToken ct)
    {
        var result = await _subscriptionPlanService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
