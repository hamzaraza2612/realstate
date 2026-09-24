using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility;

public enum ServiceRequestCategory
{
    Cleaning = 0,
    Security = 1,
    ItSupport = 2,
    FrontDesk = 3,
    Other = 4
}

/// <summary>A generic facility service request (front-desk/cleaning/security/IT — operational requests,
/// distinct from a physical repair). Deliberately reuses Property.MaintenancePriority/MaintenanceStatus/
/// MaintenanceStatusRules rather than redefining an identical priority/status vocabulary — the two
/// request types share the same lifecycle shape but are different concepts (a repair vs. an operational
/// ask), so this stays its own entity rather than overloading MaintenanceRequest.Category further.</summary>
public class ServiceRequest : TenantEntity
{
    public string RequestNumber { get; set; } = default!;
    public Guid FacilityId { get; set; }
    public Guid? SpaceId { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid? RequestedByUserId { get; set; }
    public Guid? RequesterCustomerId { get; set; }

    public ServiceRequestCategory Category { get; set; }
    public Property.MaintenancePriority Priority { get; set; } = Property.MaintenancePriority.Medium;
    public string Description { get; set; } = default!;
    public DateOnly ReportedDate { get; set; }

    public Guid? AssignedToUserId { get; set; }
    public Guid? AssignedVendorId { get; set; }

    public Property.MaintenanceStatus Status { get; set; } = Property.MaintenanceStatus.Open;
    public string? ResolutionNotes { get; set; }
    public DateOnly? ResolvedDate { get; set; }
}
