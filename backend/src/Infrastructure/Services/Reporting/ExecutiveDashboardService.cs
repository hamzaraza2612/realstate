using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Construction.Dashboard;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Application.Property.Dashboard;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Executive;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Property;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

/// <summary>
/// Pure aggregation over existing tables plus a handful of already-implemented dashboard/report
/// services (Finance P&amp;L/Cash Flow, Property occupancy, CRM conversion) — see
/// ExecutiveDashboardDto's field-by-field doc comments for exactly which figures are reused
/// verbatim vs. computed fresh here, and why.
/// </summary>
public class ExecutiveDashboardService : IExecutiveDashboardService
{
    private readonly AppDbContext _db;
    private readonly IFinanceReportService _financeReports;
    private readonly IPropertyDashboardService _propertyDashboard;
    private readonly ICrmDashboardService _crmDashboard;

    public ExecutiveDashboardService(
        AppDbContext db,
        IFinanceReportService financeReports,
        IPropertyDashboardService propertyDashboard,
        ICrmDashboardService crmDashboard)
    {
        _db = db;
        _financeReports = financeReports;
        _propertyDashboard = propertyDashboard;
        _crmDashboard = crmDashboard;
    }

    public async Task<ExecutiveDashboardDto> GetAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var sales = await _db.Bookings
            .Where(b => b.Status == BookingStatus.Confirmed && b.BookingDate >= resolvedFrom && b.BookingDate <= resolvedTo)
            .SumAsync(b => (decimal?)b.NetPrice, ct) ?? 0m;

        var salesCollections = await _db.Payments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
        var rentalCollected = await _db.RentPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;
        var facilityCollections = await _db.FacilityPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        var profitAndLoss = await _financeReports.GetProfitAndLossAsync(resolvedFrom, resolvedTo, ct);
        var cashFlow = await _financeReports.GetCashFlowAsync(null, resolvedTo, ct);

        var receivables = await _db.Installments
            .Where(i => i.Status != InstallmentStatus.Cancelled && i.Amount > i.PaidAmount)
            .SumAsync(i => (decimal?)(i.Amount - i.PaidAmount), ct) ?? 0m;
        var payables = await _db.Expenses
            .Where(e => e.Status == ExpenseStatus.Approved && e.Amount > e.PaidAmount)
            .SumAsync(e => (decimal?)(e.Amount - e.PaidAmount), ct) ?? 0m;

        var activeProjects = await _db.Projects.CountAsync(p => p.Status == ProjectStatus.Active, ct);

        var inventoryCounts = await _db.InventoryUnits
            .GroupBy(u => u.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var available = inventoryCounts.Where(x => x.Status == InventoryStatus.Available).Sum(x => x.Count);
        var reserved = inventoryCounts.Where(x => x.Status is InventoryStatus.Reserved or InventoryStatus.Booked).Sum(x => x.Count);
        var sold = inventoryCounts.Where(x => x.Status == InventoryStatus.Sold).Sum(x => x.Count);
        var totalInventory = inventoryCounts.Sum(x => x.Count);

        var propertyDashboard = await _propertyDashboard.GetAsync(ct);

        var rentalOutstanding = await _db.RentSchedules
            .Where(r => r.Status != RentScheduleStatus.Cancelled && r.Amount > r.PaidAmount)
            .SumAsync(r => (decimal?)(r.Amount - r.PaidAmount), ct) ?? 0m;

        var workPackageProgress = await _db.WorkPackages
            .Where(w => w.Status != WorkPackageStatus.Cancelled)
            .Select(w => (decimal)w.ProgressPercent)
            .ToListAsync(ct);
        decimal? constructionProgress = workPackageProgress.Count == 0 ? null : Math.Round(workPackageProgress.Average(), 1);

        var openPoStatuses = new[] { PurchaseOrderStatus.PendingApproval, PurchaseOrderStatus.Approved, PurchaseOrderStatus.Sent, PurchaseOrderStatus.PartiallyReceived };
        var procurementExposure = await _db.PurchaseOrders
            .Where(po => openPoStatuses.Contains(po.Status))
            .SumAsync(po => (decimal?)po.Total, ct) ?? 0m;

        var openMaintenanceStatuses = new[] { MaintenanceStatus.Open, MaintenanceStatus.Assigned, MaintenanceStatus.InProgress, MaintenanceStatus.OnHold };
        var maintenanceBacklog = await _db.MaintenanceRequests.CountAsync(m => openMaintenanceStatuses.Contains(m.Status), ct);

        var crmDashboard = await _crmDashboard.GetAsync(ct);

        return new ExecutiveDashboardDto(
            resolvedFrom, resolvedTo,
            sales,
            salesCollections + rentalCollected + facilityCollections,
            profitAndLoss.TotalRevenue,
            profitAndLoss.TotalExpenses,
            profitAndLoss.NetIncome,
            rentalCollected,
            receivables,
            payables,
            cashFlow.ClosingCash,
            activeProjects,
            new ExecutiveInventorySummaryDto(available, reserved, sold, totalInventory),
            propertyDashboard.TotalUnits == 0 ? null : propertyDashboard.OccupancyRate,
            rentalOutstanding,
            constructionProgress,
            procurementExposure,
            maintenanceBacklog,
            crmDashboard.TotalLeads,
            crmDashboard.ConversionRatePercent);
    }
}
