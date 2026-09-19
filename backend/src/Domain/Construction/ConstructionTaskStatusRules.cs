namespace RealEstateErp.Domain.Construction;

/// <summary>Valid task transitions: Planned → InProgress → Completed, with Blocked as a pause and Cancelled reachable from any non-terminal state.</summary>
public static class ConstructionTaskStatusRules
{
    private static readonly Dictionary<ConstructionTaskStatus, ConstructionTaskStatus[]> Allowed = new()
    {
        [ConstructionTaskStatus.Planned] = new[] { ConstructionTaskStatus.InProgress, ConstructionTaskStatus.Cancelled },
        [ConstructionTaskStatus.InProgress] = new[] { ConstructionTaskStatus.Blocked, ConstructionTaskStatus.Completed, ConstructionTaskStatus.Cancelled },
        [ConstructionTaskStatus.Blocked] = new[] { ConstructionTaskStatus.InProgress, ConstructionTaskStatus.Cancelled },
        [ConstructionTaskStatus.Completed] = Array.Empty<ConstructionTaskStatus>(),
        [ConstructionTaskStatus.Cancelled] = Array.Empty<ConstructionTaskStatus>(),
    };

    public static bool CanTransition(ConstructionTaskStatus from, ConstructionTaskStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
