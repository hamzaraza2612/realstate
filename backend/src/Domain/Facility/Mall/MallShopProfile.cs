using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Mall;

/// <summary>Mall-specific descriptive metadata for a Space (Type = Shop) — deliberately not a parallel
/// lease/tenancy model. Shop assignment itself is the existing Property.Lease against the Space's linked
/// PropertyUnit; this only holds the handful of fields a mall shop needs that a generic Lease doesn't.</summary>
public class MallShopProfile : TenantEntity
{
    public Guid SpaceId { get; set; }
    public string? TradeCategory { get; set; }
    public string? StorefrontName { get; set; }
    public string? Notes { get; set; }
}
