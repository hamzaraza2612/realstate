using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class ConstructionReportService : IConstructionReportService
{
    private readonly AppDbContext _db;

    public ConstructionReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<WorkPackageProgressRowDto>> WorkPackageProgressAsync(Guid? projectId, WorkPackageStatus? status, CancellationToken ct = default)
    {
        var query = _db.WorkPackages.AsQueryable();
        if (projectId.HasValue) query = query.Where(w => w.ProjectId == projectId);
        if (status.HasValue) query = query.Where(w => w.Status == status);

        var workPackages = await query.ToListAsync(ct);
        var projectNames = await _db.Projects.Where(p => workPackages.Select(w => w.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var expensesByWorkPackage = await _db.Expenses
            .Where(e => e.Status == ExpenseStatus.Approved && e.WorkPackageId != null && workPackages.Select(w => w.Id).Contains(e.WorkPackageId!.Value))
            .GroupBy(e => e.WorkPackageId!.Value)
            .Select(g => new { WorkPackageId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.WorkPackageId, x => x.Total, ct);

        return workPackages.Select(w => new WorkPackageProgressRowDto(
                w.Id, w.Name, w.Code, w.ProjectId, projectNames.GetValueOrDefault(w.ProjectId, ""),
                w.Status, w.ProgressPercent, w.Budget, expensesByWorkPackage.GetValueOrDefault(w.Id)))
            .OrderBy(r => r.ProjectName).ThenBy(r => r.Code)
            .ToList();
    }

    public async Task<IReadOnlyList<ConstructionExpenseRowDto>> ExpensesByCategoryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default)
    {
        var query = _db.Expenses.Where(e => e.Status == ExpenseStatus.Approved);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= from);
        if (to.HasValue) query = query.Where(e => e.ExpenseDate <= to);
        if (projectId.HasValue) query = query.Where(e => e.ProjectId == projectId);

        var rows = await query
            .GroupBy(e => e.Category)
            .Select(g => new ConstructionExpenseRowDto(g.Key, g.Count(), g.Sum(e => e.Amount)))
            .ToListAsync(ct);

        return rows.OrderByDescending(r => r.Total).ToList();
    }

    public async Task<IReadOnlyList<BudgetVsActualRowDto>> BudgetVsActualAsync(Guid? projectId, CancellationToken ct = default)
    {
        var query = _db.WorkPackages.Where(w => w.Status != WorkPackageStatus.Cancelled);
        if (projectId.HasValue) query = query.Where(w => w.ProjectId == projectId);
        var workPackages = await query.ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => workPackages.Select(w => w.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var expensesByWorkPackage = await _db.Expenses
            .Where(e => e.Status == ExpenseStatus.Approved && e.WorkPackageId != null && workPackages.Select(w => w.Id).Contains(e.WorkPackageId!.Value))
            .GroupBy(e => e.WorkPackageId!.Value)
            .Select(g => new { WorkPackageId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.WorkPackageId, x => x.Total, ct);

        return workPackages.Select(w =>
        {
            var actual = expensesByWorkPackage.GetValueOrDefault(w.Id);
            return new BudgetVsActualRowDto(w.Id, w.Name, w.ProjectId, projectNames.GetValueOrDefault(w.ProjectId, ""), w.Budget, actual, w.Budget - actual);
        }).OrderBy(r => r.ProjectName).ThenBy(r => r.WorkPackageName).ToList();
    }
}
