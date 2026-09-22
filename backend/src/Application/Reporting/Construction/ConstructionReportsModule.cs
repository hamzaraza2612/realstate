using RealEstateErp.Domain.Construction;

namespace RealEstateErp.Application.Reporting.Construction;

public record WorkPackageProgressRowDto(
    Guid Id, string Name, string Code, Guid ProjectId, string ProjectName,
    WorkPackageStatus Status, int ProgressPercent, decimal? Budget, decimal ActualExpenses);

public record ConstructionExpenseRowDto(ExpenseCategory Category, int Count, decimal Total);

/// <summary>Only Approved expenses count as actual spend against a budget — Pending/Rejected have
/// no Finance posting. Rows with a null Budget are WorkPackages that never had one set; they are
/// still listed (Actual is real) but Variance is null, not zero, since "zero variance" would
/// falsely imply an on-budget outcome.</summary>
public record BudgetVsActualRowDto(Guid WorkPackageId, string WorkPackageName, Guid ProjectId, string ProjectName, decimal? Budget, decimal Actual, decimal? Variance);

public interface IConstructionReportService
{
    Task<IReadOnlyList<WorkPackageProgressRowDto>> WorkPackageProgressAsync(Guid? projectId, WorkPackageStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<ConstructionExpenseRowDto>> ExpensesByCategoryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<BudgetVsActualRowDto>> BudgetVsActualAsync(Guid? projectId, CancellationToken ct = default);
}
