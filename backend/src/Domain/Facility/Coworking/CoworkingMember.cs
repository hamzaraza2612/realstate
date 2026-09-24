using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

/// <summary>A coworking-side overlay on an existing CRM Customer — mirrors Property.RentalTenant's design
/// exactly, deliberately not a duplicate customer/tenant concept.</summary>
public class CoworkingMember : TenantEntity
{
    public Guid CustomerId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}
