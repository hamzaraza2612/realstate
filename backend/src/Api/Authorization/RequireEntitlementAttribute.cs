using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;

namespace RealEstateErp.Api.Authorization;

/// <summary>
/// Gates a controller/action on a Feature entitlement code (see Domain.Subscription.EntitlementCodes)
/// — deliberately an action filter, not an ASP.NET Core authorization policy: PermissionPolicyProvider
/// already claims every dotted policy name for RequirePermission, and an entitlement check is a
/// business-rule gate (what this tenant's plan grants), not an authentication/authorization concern.
/// Works identically for internal and portal tokens, since both carry the same "tenant_id" claim
/// ITenantContext reads (see docs/PORTAL_ARCHITECTURE.md); apply it to a plain controller or a Portal
/// controller base class the same way. A tenant with no plan assigned (ITenantEntitlementService's
/// "unrestricted access" default) always passes. Returns the same {title, status, code} shape as
/// every other rejected request in this codebase — never a stack trace or internal detail.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireEntitlementAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _code;

    public RequireEntitlementAttribute(string code)
    {
        _code = code;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var tenantContext = context.HttpContext.RequestServices.GetRequiredService<ITenantContext>();

        if (tenantContext.TenantId is { } tenantId && !tenantContext.IsSuperAdmin)
        {
            var entitlements = context.HttpContext.RequestServices.GetRequiredService<ITenantEntitlementService>();
            var enabled = await entitlements.IsFeatureEnabledAsync(tenantId, _code, context.HttpContext.RequestAborted);
            if (!enabled)
            {
                context.Result = new ObjectResult(new
                {
                    title = "This feature is not included in your current plan.",
                    status = StatusCodes.Status403Forbidden,
                    code = "feature_not_entitled"
                })
                { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }
        }

        await next();
    }
}
