using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Construction;

public enum ConstructionTaskStatus
{
    Planned = 0,
    InProgress = 1,
    Blocked = 2,
    Completed = 3,
    Cancelled = 4
}

public enum ConstructionTaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

/// <summary>A unit of work within a WorkPackage. DependsOnTaskId is a single-predecessor pointer — a scheduling foundation, not a full dependency graph.</summary>
public class ConstructionTask : TenantEntity
{
    public Guid WorkPackageId { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid? AssignedToUserId { get; set; }

    public ConstructionTaskPriority Priority { get; set; } = ConstructionTaskPriority.Medium;

    public DateOnly? PlannedStartDate { get; set; }
    public DateOnly? PlannedEndDate { get; set; }
    public DateOnly? ActualStartDate { get; set; }
    public DateOnly? ActualEndDate { get; set; }

    public ConstructionTaskStatus Status { get; set; } = ConstructionTaskStatus.Planned;
    public int ProgressPercent { get; set; }

    public Guid? DependsOnTaskId { get; set; }
}
