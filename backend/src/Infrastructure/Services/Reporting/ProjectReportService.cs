using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Projects;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class ProjectReportService : IProjectReportService
{
    private readonly AppDbContext _db;

    public ProjectReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryAvailabilityRowDto>> InventoryAvailabilityAsync(Guid? projectId, CancellationToken ct = default)
    {
        var query = _db.InventoryUnits.AsQueryable();
        if (projectId.HasValue) query = query.Where(u => u.ProjectId == projectId);

        var rows = await query
            .GroupBy(u => new { u.ProjectId, u.Status })
            .Select(g => new { g.Key.ProjectId, g.Key.Status, Count = g.Count() })
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => rows.Select(r => r.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return rows.Select(r => r.ProjectId).Distinct().Select(pid =>
        {
            var forProject = rows.Where(r => r.ProjectId == pid).ToList();
            int Count(InventoryStatus s) => forProject.Where(r => r.Status == s).Sum(r => r.Count);
            return new InventoryAvailabilityRowDto(
                pid, projectNames.GetValueOrDefault(pid, ""),
                Count(InventoryStatus.Available), Count(InventoryStatus.Reserved), Count(InventoryStatus.Booked),
                Count(InventoryStatus.Sold), Count(InventoryStatus.Blocked), Count(InventoryStatus.UnderConstruction),
                Count(InventoryStatus.HandedOver), forProject.Sum(r => r.Count));
        }).OrderBy(r => r.ProjectName).ToList();
    }

    public async Task<IReadOnlyList<SoldVsAvailableRowDto>> SoldVsAvailableAsync(Guid? projectId, CancellationToken ct = default)
    {
        var availability = await InventoryAvailabilityAsync(projectId, ct);
        return availability.Select(a =>
        {
            var available = a.Total - a.Sold;
            var soldPercent = a.Total == 0 ? 0 : Math.Round(a.Sold * 100m / a.Total, 1);
            return new SoldVsAvailableRowDto(a.ProjectId, a.ProjectName, a.Sold, available, a.Total, soldPercent);
        }).ToList();
    }

    public async Task<IReadOnlyList<ProjectSalesSummaryRowDto>> SalesSummaryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default)
    {
        var query = _db.Bookings.Where(b => b.Status == BookingStatus.Confirmed);
        if (from.HasValue) query = query.Where(b => b.BookingDate >= from);
        if (to.HasValue) query = query.Where(b => b.BookingDate <= to);
        if (projectId.HasValue) query = query.Where(b => b.ProjectId == projectId);

        var rows = await query
            .GroupBy(b => b.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count(), Total = g.Sum(b => b.NetPrice) })
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => rows.Select(r => r.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return rows.Select(r => new ProjectSalesSummaryRowDto(r.ProjectId, projectNames.GetValueOrDefault(r.ProjectId, ""), r.Count, r.Total))
            .OrderByDescending(r => r.TotalNetPrice)
            .ToList();
    }

    public async Task<IReadOnlyList<ProjectCollectionSummaryRowDto>> CollectionSummaryAsync(Guid? projectId, CancellationToken ct = default)
    {
        var bookingQuery = _db.Bookings.AsQueryable();
        if (projectId.HasValue) bookingQuery = bookingQuery.Where(b => b.ProjectId == projectId);
        var bookings = await bookingQuery.Select(b => new { b.Id, b.ProjectId }).ToListAsync(ct);
        var bookingToProject = bookings.ToDictionary(b => b.Id, b => b.ProjectId);

        var installments = await _db.Installments
            .Where(i => bookingToProject.Keys.Contains(i.BookingId) && i.Status != InstallmentStatus.Cancelled)
            .Select(i => new { i.BookingId, i.Amount, i.PaidAmount })
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => bookingToProject.Values.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return installments
            .GroupBy(i => bookingToProject[i.BookingId])
            .Select(g => new ProjectCollectionSummaryRowDto(
                g.Key, projectNames.GetValueOrDefault(g.Key, ""),
                g.Sum(i => i.Amount), g.Sum(i => i.PaidAmount), g.Sum(i => i.Amount - i.PaidAmount)))
            .OrderByDescending(r => r.Outstanding)
            .ToList();
    }

    public async Task<IReadOnlyList<ProjectFinancialSummaryRowDto>> FinancialSummaryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default)
    {
        var bookingQuery = _db.Bookings.Where(b => b.Status == BookingStatus.Confirmed);
        if (from.HasValue) bookingQuery = bookingQuery.Where(b => b.BookingDate >= from);
        if (to.HasValue) bookingQuery = bookingQuery.Where(b => b.BookingDate <= to);
        if (projectId.HasValue) bookingQuery = bookingQuery.Where(b => b.ProjectId == projectId);
        var salesByProject = await bookingQuery.GroupBy(b => b.ProjectId)
            .Select(g => new { ProjectId = g.Key, Total = g.Sum(b => b.NetPrice) })
            .ToDictionaryAsync(x => x.ProjectId, x => x.Total, ct);

        var expenseQuery = _db.Expenses.Where(e => e.Status == ExpenseStatus.Approved);
        if (from.HasValue) expenseQuery = expenseQuery.Where(e => e.ExpenseDate >= from);
        if (to.HasValue) expenseQuery = expenseQuery.Where(e => e.ExpenseDate <= to);
        if (projectId.HasValue) expenseQuery = expenseQuery.Where(e => e.ProjectId == projectId);
        var expensesByProject = await expenseQuery.GroupBy(e => e.ProjectId)
            .Select(g => new { ProjectId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.ProjectId, x => x.Total, ct);

        var projectIds = salesByProject.Keys.Union(expensesByProject.Keys).ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return projectIds.Select(pid =>
        {
            var sales = salesByProject.GetValueOrDefault(pid);
            var expenses = expensesByProject.GetValueOrDefault(pid);
            return new ProjectFinancialSummaryRowDto(pid, projectNames.GetValueOrDefault(pid, ""), sales, expenses, sales - expenses);
        }).OrderByDescending(r => r.GrossMargin).ToList();
    }

    public async Task<IReadOnlyList<ProjectProgressRowDto>> ProgressAsync(Guid? projectId, CancellationToken ct = default)
    {
        var query = _db.WorkPackages.Where(w => w.Status != WorkPackageStatus.Cancelled);
        if (projectId.HasValue) query = query.Where(w => w.ProjectId == projectId);

        var rows = await query
            .GroupBy(w => w.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count(), AverageProgress = g.Average(w => (decimal)w.ProgressPercent) })
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => rows.Select(r => r.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return rows.Select(r => new ProjectProgressRowDto(
                r.ProjectId, projectNames.GetValueOrDefault(r.ProjectId, ""), Math.Round(r.AverageProgress, 1), r.Count))
            .OrderBy(r => r.ProjectName)
            .ToList();
    }
}
