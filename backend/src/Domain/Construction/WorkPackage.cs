using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Construction;

public enum WorkPackageStatus
{
    Planned = 0,
    InProgress = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

/// <summary>
/// A phase/work package of construction work within a Project — references Project by Id rather than
/// adding columns to it, so the existing Projects/Inventory model (Milestone 3) is never touched.
/// </summary>
public class WorkPackage : TenantEntity
{
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = default!;

    /// <summary>Unique within the project (e.g. "WP-01").</summary>
    public string Code { get; set; } = default!;

    public string? Description { get; set; }

    public DateOnly? PlannedStartDate { get; set; }
    public DateOnly? PlannedEndDate { get; set; }
    public DateOnly? ActualStartDate { get; set; }
    public DateOnly? ActualEndDate { get; set; }

    public WorkPackageStatus Status { get; set; } = WorkPackageStatus.Planned;
    public int ProgressPercent { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid? ManagerUserId { get; set; }

    public decimal? Budget { get; set; }
}
