using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

/// <summary>
/// A first-class, linkable property owner — added in Milestone 13 because none existed: Property's
/// own OwnerName/OwnerContact (still present, untouched) are free text only, with no way to grant an
/// owner portal access or query "which properties does this owner have." One PropertyOwner can own
/// many Properties (Property.PropertyOwnerId, nullable — a Property need not have one); a Property
/// has at most one linked owner in this milestone, not a co-ownership model. Deliberately not merged
/// with Crm.Customer: an owner is not a buyer/tenant of the tenant organization's own product, and
/// conflating the two would let an owner's portal identity accidentally resolve into unrelated
/// Sales/CRM data through the Customer overlay pattern RentalTenant/CoworkingMember use.
/// </summary>
public class PropertyOwner : TenantEntity
{
    public string FullName { get; set; } = default!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
