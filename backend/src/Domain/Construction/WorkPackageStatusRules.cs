namespace RealEstateErp.Domain.Construction;

/// <summary>Valid work package transitions: Planned → InProgress → Completed, with OnHold as a pause and Cancelled reachable from any non-terminal state.</summary>
public static class WorkPackageStatusRules
{
    private static readonly Dictionary<WorkPackageStatus, WorkPackageStatus[]> Allowed = new()
    {
        [WorkPackageStatus.Planned] = new[] { WorkPackageStatus.InProgress, WorkPackageStatus.OnHold, WorkPackageStatus.Cancelled },
        [WorkPackageStatus.InProgress] = new[] { WorkPackageStatus.OnHold, WorkPackageStatus.Completed, WorkPackageStatus.Cancelled },
        [WorkPackageStatus.OnHold] = new[] { WorkPackageStatus.InProgress, WorkPackageStatus.Cancelled },
        [WorkPackageStatus.Completed] = Array.Empty<WorkPackageStatus>(),
        [WorkPackageStatus.Cancelled] = Array.Empty<WorkPackageStatus>(),
    };

    public static bool CanTransition(WorkPackageStatus from, WorkPackageStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
