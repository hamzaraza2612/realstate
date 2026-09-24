using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

public class MembershipPlan : TenantEntity
{
    public Guid FacilityId { get; set; }
    public string Name { get; set; } = default!;
    public int DurationDays { get; set; }
    public decimal Price { get; set; }
    /// <summary>Included hours/credits foundation — not consumed/tracked yet, just declared per plan.</summary>
    public decimal? IncludedHoursCredits { get; set; }
    public bool IsActive { get; set; } = true;
}
