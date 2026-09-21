using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Exceptions;

namespace RealEstateErp.Api.Middleware;

/// <summary>
/// Blocks an already-issued, still-cryptographically-valid JWT from being used against any protected
/// API once its tenant is Suspended/Cancelled — Login/Refresh reject a suspended tenant up front (see
/// AuthService), but a token issued before suspension would otherwise keep working until it expires.
/// Runs after UseAuthentication (needs the resolved principal/ITenantContext) and before
/// UseAuthorization, so a suspended tenant gets a consistent 403 regardless of which permission the
/// endpoint would otherwise have required. Anonymous requests and Super Admin (no TenantId) pass through.
/// </summary>
public class TenantStatusMiddleware
{
    private readonly RequestDelegate _next;

    public TenantStatusMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, AppDbContext db)
    {
        if (tenantContext.TenantId.HasValue && !tenantContext.IsSuperAdmin)
        {
            var status = await db.Tenants.Where(t => t.Id == tenantContext.TenantId)
                .Select(t => (TenantStatus?)t.Status).FirstOrDefaultAsync();

            if (status is null || !status.Value.IsUsable())
            {
                throw new ForbiddenException(status == TenantStatus.Cancelled
                    ? "This organization's account has been cancelled."
                    : "This organization's account is suspended. Contact your administrator.");
            }
        }

        await _next(context);
    }
}
