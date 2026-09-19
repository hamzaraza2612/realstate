using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Construction.Dashboard;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Construction;

public class ConstructionDashboardService : IConstructionDashboardService
{
    private readonly AppDbContext _db;

    public ConstructionDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ConstructionDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var activeProjects = await _db.Projects.CountAsync(p => p.Status == ProjectStatus.Active, ct);
        var totalWorkPackages = await _db.WorkPackages.CountAsync(ct);
        var inProgressWorkPackages = await _db.WorkPackages.CountAsync(w => w.Status == WorkPackageStatus.InProgress, ct);

        var tasks = await _db.ConstructionTasks.ToListAsync(ct);
        var totalTasks = tasks.Count;
        var completedTasks = tasks.Count(t => t.Status == ConstructionTaskStatus.Completed);
        var delayedTasks = tasks.Count(ConstructionTaskService.IsDelayed);

        var pendingApprovals = await _db.PurchaseRequests.CountAsync(r => r.Status == PurchaseRequestStatus.Submitted, ct);
        var openPurchaseOrders = await _db.PurchaseOrders.CountAsync(o =>
            o.Status != PurchaseOrderStatus.Received && o.Status != PurchaseOrderStatus.Cancelled, ct);

        var workPackages = await _db.WorkPackages.OrderByDescending(w => w.CreatedAt).Take(5).ToListAsync(ct);
        var totalBudget = await _db.WorkPackages.SumAsync(w => (decimal?)(w.Budget ?? 0), ct) ?? 0m;
        var totalExpenses = await _db.Expenses.Where(e => e.Status == ExpenseStatus.Approved).SumAsync(e => (decimal?)e.Amount, ct) ?? 0m;

        var wpIds = workPackages.Select(w => w.Id).ToList();
        var wpProjectIds = workPackages.Select(w => w.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => wpProjectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var expensesByWp = await _db.Expenses.Where(e => e.WorkPackageId.HasValue && wpIds.Contains(e.WorkPackageId.Value) && e.Status == ExpenseStatus.Approved)
            .GroupBy(e => e.WorkPackageId!.Value).Select(g => new { g.Key, Total = g.Sum(e => e.Amount) }).ToDictionaryAsync(x => x.Key, x => x.Total, ct);

        var recentDtos = workPackages.Select(w => new WorkPackageProgressDto(
            w.Id, w.Name, projectNames.GetValueOrDefault(w.ProjectId, ""), (int)w.Status, w.ProgressPercent, w.Budget,
            expensesByWp.GetValueOrDefault(w.Id))).ToList();

        return new ConstructionDashboardDto(
            activeProjects, totalWorkPackages, inProgressWorkPackages, totalTasks, delayedTasks, completedTasks,
            pendingApprovals, openPurchaseOrders, totalBudget, totalExpenses, recentDtos);
    }
}
