using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin cross-tenant visibility into every subscription and the only place lifecycle
/// transitions (Trialing→Active, Active→PastDue, etc.) are triggered manually — see
/// SubscriptionStatusRules and docs/SAAS_BILLING.md. Creating/assigning a subscription to a tenant is
/// on PlatformOrganizationsController (POST {id}/subscription) since it's naturally a tenant action;
/// this controller is for the cross-tenant list view and transitioning an existing subscription.</summary>
[Route("api/v1/platform/subscriptions")]
public class PlatformSubscriptionsController : PlatformControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public PlatformSubscriptionsController(ISubscriptionService subscriptionService, ITenantContext tenantContext) : base(tenantContext)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse.Ok(await _subscriptionService.ListAsync(ct)));

    [HttpPost("{id:guid}/transition")]
    public async Task<IActionResult> Transition(Guid id, TransitionSubscriptionRequest request, CancellationToken ct)
    {
        var result = await _subscriptionService.TransitionAsync(id, request, ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
