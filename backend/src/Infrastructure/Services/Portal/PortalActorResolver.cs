using Microsoft.EntityFrameworkCore;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Portal;

public record PortalActorInfo(bool Exists, string DisplayName, string? Email);

/// <summary>
/// The one place that knows how to go from (ActorType, ActorId) to a display name/contact email —
/// shared by PortalAccountService (invite) and PortalAuthService (login profile) so the
/// Customer/RentalTenant-overlays-Customer/Vendor/CoworkingMember-overlays-Customer/PropertyOwner
/// mapping is written once, not duplicated per caller. Always takes tenantId explicitly and queries
/// with IgnoreQueryFilters() — the same reason AuthService.BuildAuthResultAsync does: this is called
/// from the anonymous portal login path, before any ambient ITenantContext exists to drive the normal
/// global query filter.
/// </summary>
public class PortalActorResolver
{
    private readonly AppDbContext _db;

    public PortalActorResolver(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PortalActorInfo> ResolveAsync(Guid tenantId, string actorType, Guid actorId, CancellationToken ct = default)
    {
        switch (actorType)
        {
            case PortalActorTypes.Customer:
            {
                var customer = await _db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == actorId, ct);
                return customer is null ? new PortalActorInfo(false, "", null) : new PortalActorInfo(true, customer.FullName, customer.Email);
            }
            case PortalActorTypes.RentalTenant:
            {
                var tenant = await _db.RentalTenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == actorId, ct);
                if (tenant is null) return new PortalActorInfo(false, "", null);
                var customer = await _db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == tenant.CustomerId, ct);
                return new PortalActorInfo(true, customer?.FullName ?? "", customer?.Email);
            }
            case PortalActorTypes.CoworkingMember:
            {
                var member = await _db.CoworkingMembers.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.TenantId == tenantId && m.Id == actorId, ct);
                if (member is null) return new PortalActorInfo(false, "", null);
                var customer = await _db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == member.CustomerId, ct);
                return new PortalActorInfo(true, customer?.FullName ?? "", customer?.Email);
            }
            case PortalActorTypes.Vendor:
            {
                var vendor = await _db.Vendors.IgnoreQueryFilters().FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == actorId, ct);
                return vendor is null ? new PortalActorInfo(false, "", null) : new PortalActorInfo(true, vendor.Name, vendor.Email);
            }
            case PortalActorTypes.PropertyOwner:
            {
                var owner = await _db.PropertyOwners.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == actorId, ct);
                return owner is null ? new PortalActorInfo(false, "", null) : new PortalActorInfo(true, owner.FullName, owner.Email);
            }
            default:
                return new PortalActorInfo(false, "", null);
        }
    }
}
