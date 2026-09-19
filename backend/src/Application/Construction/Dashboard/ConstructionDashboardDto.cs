namespace RealEstateErp.Application.Construction.Dashboard;

public record ConstructionDashboardDto(
    int ActiveProjects,
    int TotalWorkPackages,
    int WorkPackagesInProgress,
    int TotalTasks,
    int DelayedTasks,
    int CompletedTasks,
    int PurchaseRequestsPendingApproval,
    int OpenPurchaseOrders,
    decimal TotalBudget,
    decimal TotalExpenses,
    IReadOnlyList<WorkPackageProgressDto> RecentWorkPackages);

public record WorkPackageProgressDto(Guid Id, string Name, string ProjectName, int Status, int ProgressPercent, decimal? Budget, decimal ActualExpenses);
