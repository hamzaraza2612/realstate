using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

public enum MaintenanceCategory
{
    Plumbing = 0,
    Electrical = 1,
    Hvac = 2,
    Structural = 3,
    Appliance = 4,
    Other = 5
}

public enum MaintenancePriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Urgent = 3
}

public enum MaintenanceStatus
{
    Open = 0,
    Assigned = 1,
    InProgress = 2,
    OnHold = 3,
    Resolved = 4,
    Cancelled = 5
}

/// <summary>A maintenance/repair request for a Property or PropertyUnit. Vendors are referenced from the
/// existing Procurement.Vendor table (see AssignedVendorId) — this module does not define its own vendor
/// concept or a second procurement workflow. FacilityId/SpaceId (added in Milestone 8) let this same
/// entity also serve Facility/Mall/Coworking maintenance — Facility Management deliberately reuses this
/// infrastructure instead of duplicating it; PropertyId is still always populated (from Facility.PropertyId
/// when raised against a facility) so every existing property-only query keeps working unchanged.</summary>
public class MaintenanceRequest : TenantEntity
{
    public string RequestNumber { get; set; } = default!;
    public Guid PropertyId { get; set; }
    public Guid? UnitId { get; set; }
    public Guid? FacilityId { get; set; }
    public Guid? SpaceId { get; set; }

    /// <summary>FK to RentalTenant — named RentalTenantId (not TenantId) to avoid colliding with the inherited SaaS-tenant TenantEntity.TenantId.</summary>
    public Guid? RentalTenantId { get; set; }

    public MaintenanceCategory Category { get; set; }
    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Medium;
    public string Description { get; set; } = default!;
    public DateOnly ReportedDate { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid? AssignedToUserId { get; set; }
    public Guid? AssignedVendorId { get; set; }

    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Open;
    public string? ResolutionNotes { get; set; }
    public DateOnly? CompletionDate { get; set; }

    /// <summary>SLA foundation — a plain due-by timestamp derived from SlaHours at creation, not a full
    /// escalation/breach engine.</summary>
    public int? SlaHours { get; set; }
    public DateTimeOffset? SlaDueAt { get; set; }
}

/// <summary>Valid maintenance status transitions: Open -> Assigned -> InProgress -> Resolved, with
/// OnHold as a detour and Cancelled reachable from any non-terminal state.</summary>
public static class MaintenanceStatusRules
{
    private static readonly Dictionary<MaintenanceStatus, MaintenanceStatus[]> Allowed = new()
    {
        [MaintenanceStatus.Open] = new[] { MaintenanceStatus.Assigned, MaintenanceStatus.Cancelled },
        [MaintenanceStatus.Assigned] = new[] { MaintenanceStatus.InProgress, MaintenanceStatus.OnHold, MaintenanceStatus.Cancelled },
        [MaintenanceStatus.InProgress] = new[] { MaintenanceStatus.OnHold, MaintenanceStatus.Resolved, MaintenanceStatus.Cancelled },
        [MaintenanceStatus.OnHold] = new[] { MaintenanceStatus.InProgress, MaintenanceStatus.Cancelled },
        [MaintenanceStatus.Resolved] = Array.Empty<MaintenanceStatus>(),
        [MaintenanceStatus.Cancelled] = Array.Empty<MaintenanceStatus>(),
    };

    public static bool CanTransition(MaintenanceStatus from, MaintenanceStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
