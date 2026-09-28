using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Application.Reporting.Facility;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// Deterministic, rule-generated "What Needs My Attention" items — every item here is produced by a
/// plain business rule over existing reporting/application services, never an AI-generated alert (see
/// docs/AI_ARCHITECTURE.md). AI's only role anywhere near this data is to optionally summarize a set
/// of these items in a conversation; it never creates new ones and never overrides what's here.
/// </summary>
public class AttentionEngineService : IAttentionEngineService
{
    private readonly IFinanceReportsExtensionService _financeExtension;
    private readonly ICrmDashboardService _crmDashboard;
    private readonly ISalesReportService _salesReports;
    private readonly IConstructionReportService _constructionReports;
    private readonly IPropertyReportService _propertyReports;
    private readonly ILeaseService _leaseService;
    private readonly IFacilityReportService _facilityReports;
    private readonly ITenantTimeService _tenantTimeService;

    public AttentionEngineService(
        IFinanceReportsExtensionService financeExtension, ICrmDashboardService crmDashboard,
        ISalesReportService salesReports, IConstructionReportService constructionReports,
        IPropertyReportService propertyReports, ILeaseService leaseService,
        IFacilityReportService facilityReports, ITenantTimeService tenantTimeService)
    {
        _financeExtension = financeExtension;
        _crmDashboard = crmDashboard;
        _salesReports = salesReports;
        _constructionReports = constructionReports;
        _propertyReports = propertyReports;
        _leaseService = leaseService;
        _facilityReports = facilityReports;
        _tenantTimeService = tenantTimeService;
    }

    public async Task<IReadOnlyList<AttentionItemDto>> GetAsync(CancellationToken ct = default)
    {
        var items = new List<AttentionItemDto>();
        var today = await _tenantTimeService.TodayAsync(ct);

        await AddReceivablesAsync(items, ct);
        await AddPayablesAsync(items, ct);
        await AddStaleLeadsAsync(items, ct);
        await AddCancelledBookingsAsync(items, today, ct);
        await AddConstructionOverBudgetAsync(items, ct);
        await AddOverdueRentAsync(items, ct);
        await AddExpiringLeasesAsync(items, today, ct);
        await AddMaintenanceBacklogAsync(items, ct);

        return items;
    }

    private async Task AddReceivablesAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var aging = await _financeExtension.GetArAgingAsync(ct);
        var top = aging.Rows.Where(r => r.Total > 0).OrderByDescending(r => r.Total).Take(3).ToList();
        if (top.Count == 0) return;

        items.Add(new AttentionItemDto(
            "Finance", "Overdue receivables need follow-up",
            $"{aging.Rows.Count(r => r.Total > 0)} customers owe a total of {aging.TotalOutstanding:N2}.",
            aging.Rows.Sum(r => r.Days90Plus) >= aging.TotalOutstanding * 0.25m ? HealthStatus.Critical : HealthStatus.Attention,
            "Customer", top[0].CustomerId,
            top.Select(r => $"{r.CustomerName}: {r.Total:N2} outstanding").ToList(),
            "Review the highest-balance overdue customers first."));
    }

    private async Task AddPayablesAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var aging = await _financeExtension.GetApAgingAsync(ct);
        var top = aging.Rows.Where(r => r.Total > 0).OrderByDescending(r => r.Total).Take(3).ToList();
        if (top.Count == 0) return;

        items.Add(new AttentionItemDto(
            "Finance", "Vendor payables are outstanding",
            $"{aging.Rows.Count(r => r.Total > 0)} vendors are owed a total of {aging.TotalOutstanding:N2}.",
            HealthStatus.Attention,
            "Vendor", top[0].VendorId,
            top.Select(r => $"{r.VendorName}: {r.Total:N2} outstanding").ToList(),
            "Plan payment for the largest outstanding balances."));
    }

    private async Task AddStaleLeadsAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var dashboard = await _crmDashboard.GetAsync(ct);
        if (dashboard.OverdueFollowUps == 0) return;

        var severity = dashboard.PendingFollowUps > 0 && (double)dashboard.OverdueFollowUps / dashboard.PendingFollowUps >= 0.5
            ? HealthStatus.Critical : HealthStatus.Attention;

        items.Add(new AttentionItemDto(
            "Sales", "Leads have overdue follow-ups",
            $"{dashboard.OverdueFollowUps} of {dashboard.PendingFollowUps} pending follow-ups are overdue.",
            severity, null, null,
            new List<string> { $"{dashboard.OverdueFollowUps} overdue follow-ups", $"{dashboard.UnassignedLeads} unassigned leads" },
            "Review overdue follow-ups in the CRM inbox."));
    }

    private async Task AddCancelledBookingsAsync(List<AttentionItemDto> items, DateOnly today, CancellationToken ct)
    {
        var (from, to) = ReportDateRange.Resolve(null, today, today);
        var filter = new SalesReportFilter(from, to, null, null, null, null);
        var cancellations = await _salesReports.CancellationsAsync(new PagedRequest { Page = 1, PageSize = 5 }, filter, ct);
        if (cancellations.Total == 0) return;

        items.Add(new AttentionItemDto(
            "Sales", "Bookings were cancelled this period",
            $"{cancellations.Total} booking(s) were cancelled between {from} and {to}.",
            HealthStatus.Attention, null, null,
            cancellations.Data.Select(c => $"{c.BookingNumber}: {c.CustomerName}, {c.NetPrice:N2}").ToList(),
            "Review why these bookings were lost."));
    }

    private async Task AddConstructionOverBudgetAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var packages = await _constructionReports.WorkPackageProgressAsync(null, null, ct);
        var overBudget = packages.Where(p => p.Budget is > 0 && p.ActualExpenses > p.Budget)
            .OrderByDescending(p => p.ActualExpenses - p.Budget!.Value).Take(3).ToList();
        if (overBudget.Count == 0) return;

        items.Add(new AttentionItemDto(
            "Construction", "Work packages are over budget",
            $"{overBudget.Count} work package(s) have exceeded their budget.",
            HealthStatus.Attention, "WorkPackage", overBudget[0].Id,
            overBudget.Select(p => $"{p.Name} ({p.ProjectName}): {p.ActualExpenses:N2} actual vs {p.Budget:N2} budget").ToList(),
            "Review the highest-variance work packages first."));
    }

    private async Task AddOverdueRentAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var overdue = await _propertyReports.OverdueRentAsync(ct);
        if (overdue.Count == 0) return;

        var top = overdue.OrderByDescending(o => o.OutstandingAmount).Take(3).ToList();
        items.Add(new AttentionItemDto(
            "Rental", "Overdue rent requires follow-up",
            $"{overdue.Count} lease(s) have overdue rent totalling {overdue.Sum(o => o.OutstandingAmount):N2}.",
            overdue.Count >= 5 ? HealthStatus.Critical : HealthStatus.Attention,
            "Lease", top[0].LeaseId,
            top.Select(o => $"{o.TenantName} ({o.PropertyName}): {o.OutstandingAmount:N2}, {o.DaysPastDue} days overdue").ToList(),
            "Contact the tenants with the largest overdue balances."));
    }

    private async Task AddExpiringLeasesAsync(List<AttentionItemDto> items, DateOnly today, CancellationToken ct)
    {
        var activeLeases = await _leaseService.ListAsync(
            new PagedRequest { Page = 1, PageSize = 200 }, new LeaseFilter(null, null, null, LeaseStatus.Active, null), ct);
        var expiring = activeLeases.Data.Where(l => l.EndDate <= today.AddDays(30)).OrderBy(l => l.EndDate).Take(5).ToList();
        if (expiring.Count == 0) return;

        items.Add(new AttentionItemDto(
            "Rental", "Leases are expiring within 30 days",
            $"{expiring.Count} lease(s) expire within the next 30 days.",
            HealthStatus.Attention, "Lease", expiring[0].Id,
            expiring.Select(l => $"{l.RentalTenantName} ({l.PropertyName}): expires {l.EndDate}").ToList(),
            "Contact these tenants about renewal."));
    }

    private async Task AddMaintenanceBacklogAsync(List<AttentionItemDto> items, CancellationToken ct)
    {
        var backlog = await _facilityReports.MaintenanceBacklogAsync(ct);
        if (backlog.Count == 0) return;

        items.Add(new AttentionItemDto(
            "Facility", "Maintenance requests are unresolved",
            $"{backlog.Count} maintenance request(s) are open.",
            backlog.Count >= 10 ? HealthStatus.Critical : HealthStatus.Attention,
            null, null,
            new List<string> { $"{backlog.Count} open requests" },
            "Review the oldest open requests first."));
    }
}
