using System.Text.Json;
using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Construction;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Application.Procurement;
using RealEstateErp.Application.Projects.Hierarchy;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Application.Reporting.Executive;
using RealEstateErp.Application.Reporting.Facility;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Application.Reporting.Procurement;
using RealEstateErp.Application.Reporting.Projects;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Infrastructure.Services.Ai.Tools;

/// <summary>
/// The controlled READ half of the AI tool registry — every one of these wraps an EXISTING,
/// already-tested Milestone-12 reporting service or Milestone-14 usage service; none of them queries
/// the database directly (see docs/AI_ARCHITECTURE.md "AI + Reporting Reuse"). Each declares the same
/// module permission its underlying report controller already requires, so a user who couldn't see
/// e.g. Finance's own reports in the ERP UI can't see them via the AI either — IAiToolRegistry
/// filters on exactly this before the model is ever told the tool exists.
/// </summary>
public class ExecutiveDashboardTool : IAiTool
{
    private readonly IExecutiveDashboardService _service;
    private readonly ITenantTimeService _tenantTimeService;
    public ExecutiveDashboardTool(IExecutiveDashboardService service, ITenantTimeService tenantTimeService) { _service = service; _tenantTimeService = tenantTimeService; }

    public string Name => "executive.dashboard";
    public string Description => "Overall business KPIs for a period: sales, collections, revenue, expenses, profit, receivables, cash position.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Reports.View;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("from", "string", "Start date (YYYY-MM-DD). Defaults to the start of the current month."),
        new AiJsonSchema.Prop("to", "string", "End date (YYYY-MM-DD). Defaults to today."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (from, to) = ReportDateRange.Resolve(arguments.TryGetDate("from"), arguments.TryGetDate("to"), today);
        return Result.Success<object>(await _service.GetAsync(from, to, ct));
    }
}

public class ReceivablesAgingTool : IAiTool
{
    private readonly IFinanceReportsExtensionService _service;
    public ReceivablesAgingTool(IFinanceReportsExtensionService service) { _service = service; }

    public string Name => "finance.receivables_aging";
    public string Description => "Accounts receivable aging by customer (current, 1-30, 31-60, 61-90, 90+ days overdue) with total outstanding.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Finance.ReportsView;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var report = await _service.GetArAgingAsync(ct);
        return Result.Success<object>(new
        {
            report.TotalOutstanding,
            TopCustomers = report.Rows.OrderByDescending(r => r.Total).Take(10)
        });
    }
}

public class PayablesAgingTool : IAiTool
{
    private readonly IFinanceReportsExtensionService _service;
    public PayablesAgingTool(IFinanceReportsExtensionService service) { _service = service; }

    public string Name => "finance.payables_aging";
    public string Description => "Accounts payable aging by vendor (current, 1-30, 31-60, 61-90, 90+ days) with total outstanding.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Finance.ReportsView;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var report = await _service.GetApAgingAsync(ct);
        return Result.Success<object>(new
        {
            report.TotalOutstanding,
            TopVendors = report.Rows.OrderByDescending(r => r.Total).Take(10)
        });
    }
}

public class CashPositionTool : IAiTool
{
    private readonly IFinanceReportService _service;
    private readonly ITenantTimeService _tenantTimeService;
    public CashPositionTool(IFinanceReportService service, ITenantTimeService tenantTimeService) { _service = service; _tenantTimeService = tenantTimeService; }

    public string Name => "finance.cash_position";
    public string Description => "Cash flow for a period: opening cash, inflows by source, outflows by source, net change, closing cash.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Finance.ReportsView;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("from", "string", "Start date (YYYY-MM-DD)."),
        new AiJsonSchema.Prop("to", "string", "End date (YYYY-MM-DD)."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (from, to) = ReportDateRange.Resolve(arguments.TryGetDate("from"), arguments.TryGetDate("to"), today);
        return Result.Success<object>(await _service.GetCashFlowAsync(from, to, ct));
    }
}

public class ProfitAndLossTool : IAiTool
{
    private readonly IFinanceReportService _service;
    private readonly ITenantTimeService _tenantTimeService;
    public ProfitAndLossTool(IFinanceReportService service, ITenantTimeService tenantTimeService) { _service = service; _tenantTimeService = tenantTimeService; }

    public string Name => "finance.profit_and_loss";
    public string Description => "Profit & Loss for a period: revenue lines, expense lines, net income.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Finance.ReportsView;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("from", "string", "Start date (YYYY-MM-DD)."),
        new AiJsonSchema.Prop("to", "string", "End date (YYYY-MM-DD)."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (from, to) = ReportDateRange.Resolve(arguments.TryGetDate("from"), arguments.TryGetDate("to"), today);
        return Result.Success<object>(await _service.GetProfitAndLossAsync(from, to, ct));
    }
}

public class SalesSummaryTool : IAiTool
{
    private readonly ISalesReportService _service;
    private readonly ITenantTimeService _tenantTimeService;
    public SalesSummaryTool(ISalesReportService service, ITenantTimeService tenantTimeService) { _service = service; _tenantTimeService = tenantTimeService; }

    public string Name => "sales.summary";
    public string Description => "Sales bookings for a period, broken down by project, plus lead-to-booking conversion rate.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Sales.BookingView;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("from", "string", "Start date (YYYY-MM-DD)."),
        new AiJsonSchema.Prop("to", "string", "End date (YYYY-MM-DD)."),
        new AiJsonSchema.Prop("projectId", "string", "Optional project id to filter to."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (from, to) = ReportDateRange.Resolve(arguments.TryGetDate("from"), arguments.TryGetDate("to"), today);
        var filter = new SalesReportFilter(from, to, arguments.TryGetGuid("projectId"), null, null, null);
        var byProject = await _service.SalesByProjectAsync(filter, ct);
        var conversion = await _service.BookingConversionAsync(from, to, ct);
        return Result.Success<object>(new { From = from, To = to, ByProject = byProject, Conversion = conversion });
    }
}

public class CollectionsSummaryTool : IAiTool
{
    private readonly ISalesReportService _service;
    private readonly ITenantTimeService _tenantTimeService;
    public CollectionsSummaryTool(ISalesReportService service, ITenantTimeService tenantTimeService) { _service = service; _tenantTimeService = tenantTimeService; }

    public string Name => "sales.collections";
    public string Description => "Sales payment collections for a period, and outstanding installment receivable aging.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Sales.BookingView;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("from", "string", "Start date (YYYY-MM-DD)."),
        new AiJsonSchema.Prop("to", "string", "End date (YYYY-MM-DD)."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (from, to) = ReportDateRange.Resolve(arguments.TryGetDate("from"), arguments.TryGetDate("to"), today);
        var filter = new SalesReportFilter(from, to, null, null, null, null);
        var collections = await _service.CollectionsAsync(filter, ct);
        var aging = await _service.ReceivableAgingAsync(ct);
        return Result.Success<object>(new { From = from, To = to, Collections = collections, TopOverdue = aging.OrderByDescending(a => a.Total).Take(10) });
    }
}

public class LeadFunnelTool : IAiTool
{
    private readonly ICrmDashboardService _service;
    public LeadFunnelTool(ICrmDashboardService service) { _service = service; }

    public string Name => "crm.lead_funnel";
    public string Description => "CRM lead funnel: total/new/unassigned leads, leads by status, pending and overdue follow-ups, conversion rate.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Crm.LeadView;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default) =>
        Result.Success<object>(await _service.GetAsync(ct));
}

public class ProjectPerformanceTool : IAiTool
{
    private readonly IProjectReportService _service;
    public ProjectPerformanceTool(IProjectReportService service) { _service = service; }

    public string Name => "projects.performance";
    public string Description => "Project sales progress, inventory sold-vs-available, and financial summary (revenue collected vs. direct cost), optionally for one project.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Projects.View;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("projectId", "string", "Optional project id to filter to."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var projectId = arguments.TryGetGuid("projectId");
        var progress = await _service.ProgressAsync(projectId, ct);
        var financial = await _service.FinancialSummaryAsync(null, null, projectId, ct);
        var soldVsAvailable = await _service.SoldVsAvailableAsync(projectId, ct);
        return Result.Success<object>(new { Progress = progress, Financial = financial, SoldVsAvailable = soldVsAvailable });
    }
}

public class ConstructionProgressTool : IAiTool
{
    private readonly IConstructionReportService _service;
    public ConstructionProgressTool(IConstructionReportService service) { _service = service; }

    public string Name => "construction.progress";
    public string Description => "Work package progress and budget-vs-actual expense variance, optionally for one project.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Construction.View;
    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("projectId", "string", "Optional project id to filter to."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var projectId = arguments.TryGetGuid("projectId");
        var progress = await _service.WorkPackageProgressAsync(projectId, null, ct);
        var budgetVsActual = await _service.BudgetVsActualAsync(projectId, ct);
        return Result.Success<object>(new { Progress = progress, BudgetVsActual = budgetVsActual });
    }
}

public class ProcurementExposureTool : IAiTool
{
    private readonly IProcurementReportService _service;
    public ProcurementExposureTool(IProcurementReportService service) { _service = service; }

    public string Name => "procurement.exposure";
    public string Description => "Open purchase-order financial exposure and vendor spend breakdown.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Procurement.View;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var exposure = await _service.PurchaseOrderExposureAsync(ct);
        var status = await _service.StatusBreakdownAsync(ct);
        return Result.Success<object>(new { Exposure = exposure, StatusBreakdown = status });
    }
}

public class RentalPerformanceTool : IAiTool
{
    private readonly IPropertyReportService _service;
    public RentalPerformanceTool(IPropertyReportService service) { _service = service; }

    public string Name => "rental.performance";
    public string Description => "Rental performance: property occupancy rates, overdue rent by lease/tenant, and lease status breakdown.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Property.View;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var occupancy = await _service.OccupancyAsync(ct);
        var overdue = await _service.OverdueRentAsync(ct);
        var leaseStatus = await _service.LeaseStatusAsync(ct);
        return Result.Success<object>(new
        {
            Occupancy = occupancy,
            OverdueCount = overdue.Count,
            OverdueTotal = overdue.Sum(o => o.OutstandingAmount),
            TopOverdue = overdue.OrderByDescending(o => o.OutstandingAmount).Take(10),
            LeaseStatus = leaseStatus
        });
    }
}

public class MaintenanceBacklogTool : IAiTool
{
    private readonly IFacilityReportService _service;
    public MaintenanceBacklogTool(IFacilityReportService service) { _service = service; }

    public string Name => "facility.maintenance_backlog";
    public string Description => "Unresolved facility maintenance requests, oldest first.";
    public AiToolAccess Access => AiToolAccess.Read;
    public string? RequiredPermission => Permissions.Facility.View;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var backlog = await _service.MaintenanceBacklogAsync(ct);
        return Result.Success<object>(new { Count = backlog.Count, Items = backlog.Take(15) });
    }
}

public class TenantUsageTool : IAiTool
{
    private readonly ITenantUsageService _service;
    public TenantUsageTool(ITenantUsageService service) { _service = service; }

    public string Name => "tenant.usage";
    public string Description => "This organization's current subscription usage (users, properties, projects, portal users, storage) against its plan limits.";
    public AiToolAccess Access => AiToolAccess.Read;

    /// <summary>Null — this is the tenant's own non-sensitive usage-vs-limit summary, safe for any
    /// authenticated member to see (the same posture as the tenant-facing Billing page).</summary>
    public string? RequiredPermission => null;
    public JsonElement InputSchema => AiJsonSchema.Empty;

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default) =>
        Result.Success<object>(await _service.GetUsageAsync(context.TenantId, ct));
}
