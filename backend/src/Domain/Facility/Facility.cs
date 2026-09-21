using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility;

public enum FacilityType
{
    ShoppingMall = 0,
    Coworking = 1,
    OfficeBuilding = 2,
    CommercialBuilding = 3,
    MixedUse = 4,
    Other = 5
}

public enum FacilityOperatingStatus
{
    Active = 0,
    Inactive = 1,
    UnderMaintenance = 2
}

/// <summary>The shared Facility Management foundation: an operating layer over an existing
/// Property.Property (a mall, coworking center, or general office/commercial building all reference the
/// property they physically occupy — Facility never stands in for Property). Mall and Coworking
/// specializations are built on top of this plus Space, not as separate parallel systems.</summary>
public class Facility : TenantEntity
{
    public string Code { get; set; } = default!;
    public Guid PropertyId { get; set; }
    public FacilityType Type { get; set; }
    public string Name { get; set; } = default!;
    public FacilityOperatingStatus Status { get; set; } = FacilityOperatingStatus.Active;
    public string? Description { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid? ManagerUserId { get; set; }
}
