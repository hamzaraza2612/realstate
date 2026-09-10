using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Application.Common.Interfaces;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// Base for Super-Admin-only, platform-wide endpoints (cross-tenant). The "SuperAdminOnly" policy
/// (registered in Program.cs) runs first via [Authorize]; only once that has passed does the
/// constructor enable the explicit tenant-filter bypass, so a non-super-admin can never reach
/// cross-tenant data even if a policy were misconfigured on a derived controller.
/// </summary>
[Authorize(Policy = "SuperAdminOnly")]
public abstract class PlatformControllerBase : ApiControllerBase
{
    protected PlatformControllerBase(ITenantContext tenantContext)
    {
        tenantContext.EnableSuperAdminBypass();
    }
}
