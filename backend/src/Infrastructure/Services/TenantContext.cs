using Microsoft.AspNetCore.Http;
using RealEstateErp.Application.Common.Interfaces;

namespace RealEstateErp.Infrastructure.Services;

/// <summary>
/// Resolved once per request (scoped) from the current principal's claims. EnableSuperAdminBypass
/// is only called by platform controllers, and only after ASP.NET Core authorization has already
/// verified the "SuperAdminOnly" policy on that endpoint — see PlatformControllerBase.
/// </summary>
public class TenantContext : ITenantContext
{
    private bool _bypass;

    public TenantContext(IHttpContextAccessor accessor)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = user.FindFirst("tenant_id")?.Value;
            TenantId = string.IsNullOrEmpty(tenantClaim) ? null : Guid.Parse(tenantClaim);

            var subClaim = user.FindFirst("sub")?.Value ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            UserId = string.IsNullOrEmpty(subClaim) ? null : Guid.Parse(subClaim);

            UserEmail = user.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            IsSuperAdmin = user.HasClaim("is_super_admin", "true");
        }
    }

    public Guid? TenantId { get; }
    public Guid? UserId { get; }
    public string? UserEmail { get; }
    public bool IsSuperAdmin { get; }
    public bool BypassTenantFilter => _bypass;

    public void EnableSuperAdminBypass()
    {
        if (!IsSuperAdmin)
        {
            throw new UnauthorizedAccessException("Only Super Admin can bypass tenant isolation.");
        }
        _bypass = true;
    }
}
