using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Application.Reporting.Sales;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// Six dimensions, each a plain, deterministic, documented rule over EXISTING Milestone-12 reporting
/// data — never a fabricated "score out of 100" (see docs/AI_ARCHITECTURE.md). Every threshold below
/// is a ratio/percentage/sign comparison, never a fixed currency amount, so the same rule is
/// meaningful for a tenant in AED, PKR, or any other currency (Milestone 15) without a
/// currency-specific magic number. Construction/Rental/Receivables/Payables all default to Healthy
/// when there is no data to evaluate (e.g. no open work packages) rather than flagging an empty
/// business as a problem.
/// </summary>
public class BusinessHealthService : IBusinessHealthService
{
    private readonly IFinanceReportsExtensionService _financeExtension;
    private readonly IFinanceReportService _financeReports;
    private readonly ISalesReportService _salesReports;
    private readonly IConstructionReportService _constructionReports;
    private readonly IPropertyReportService _propertyReports;
    private readonly ITenantTimeService _tenantTimeService;

    public BusinessHealthService(
        IFinanceReportsExtensionService financeExtension, IFinanceReportService financeReports,
        ISalesReportService salesReports, IConstructionReportService constructionReports,
        IPropertyReportService propertyReports, ITenantTimeService tenantTimeService)
    {
        _financeExtension = financeExtension;
        _financeReports = financeReports;
        _salesReports = salesReports;
        _constructionReports = constructionReports;
        _propertyReports = propertyReports;
        _tenantTimeService = tenantTimeService;
    }

    public async Task<BusinessHealthDto> GetAsync(CancellationToken ct = default)
    {
        var today = await _tenantTimeService.TodayAsync(ct);
        var (monthStart, _) = ReportDateRange.Resolve(null, today, today);

        var dimensions = new List<BusinessHealthDimensionDto>
        {
            await SalesAsync(monthStart, today, ct),
            await ReceivablesAsync(ct),
            await PayablesAsync(ct),
            await CashAsync(monthStart, today, ct),
            await ConstructionAsync(ct),
            await RentalAsync(ct),
        };

        var overall = dimensions.Any(d => d.Status == HealthStatus.Critical) ? HealthStatus.Critical
            : dimensions.Any(d => d.Status == HealthStatus.Attention) ? HealthStatus.Attention
            : HealthStatus.Healthy;

        return new BusinessHealthDto(overall, dimensions, DateTimeOffset.UtcNow);
    }

    private async Task<BusinessHealthDimensionDto> SalesAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var conversion = await _salesReports.BookingConversionAsync(from, to, ct);
        if (conversion.TotalLeads == 0)
        {
            return new BusinessHealthDimensionDto("Sales", HealthStatus.Healthy, "No leads this period to evaluate.", new List<string>());
        }

        var rate = conversion.ConversionRatePercent;
        var status = rate < 10 ? HealthStatus.Critical : rate < 20 ? HealthStatus.Attention : HealthStatus.Healthy;
        var reasons = new List<string> { $"Lead-to-booking conversion this period is {rate:0.#}% ({conversion.WonLeads} of {conversion.TotalLeads} leads)." };
        return new BusinessHealthDimensionDto("Sales", status, DescriptionFor(status, "Sales conversion"), reasons);
    }

    private async Task<BusinessHealthDimensionDto> ReceivablesAsync(CancellationToken ct)
    {
        var aging = await _financeExtension.GetArAgingAsync(ct);
        var days90 = aging.Rows.Sum(r => r.Days90Plus);
        var ratio = aging.TotalOutstanding > 0 ? days90 / aging.TotalOutstanding : 0;
        var status = aging.TotalOutstanding == 0 ? HealthStatus.Healthy
            : ratio >= 0.25m ? HealthStatus.Critical : HealthStatus.Attention;
        var reasons = aging.TotalOutstanding == 0
            ? new List<string> { "No outstanding receivables." }
            : new List<string>
            {
                $"{aging.Rows.Count(r => r.Total > 0)} customers have outstanding balances totalling {aging.TotalOutstanding:N2}.",
                $"{days90:N2} ({ratio:P0}) is more than 90 days overdue."
            };
        return new BusinessHealthDimensionDto("Receivables", status, DescriptionFor(status, "Receivables"), reasons);
    }

    private async Task<BusinessHealthDimensionDto> PayablesAsync(CancellationToken ct)
    {
        var aging = await _financeExtension.GetApAgingAsync(ct);
        var days90 = aging.Rows.Sum(r => r.Days90Plus);
        var ratio = aging.TotalOutstanding > 0 ? days90 / aging.TotalOutstanding : 0;
        var status = aging.TotalOutstanding == 0 ? HealthStatus.Healthy
            : ratio >= 0.25m ? HealthStatus.Critical : HealthStatus.Attention;
        var reasons = aging.TotalOutstanding == 0
            ? new List<string> { "No outstanding payables." }
            : new List<string>
            {
                $"{aging.Rows.Count(r => r.Total > 0)} vendors are owed a total of {aging.TotalOutstanding:N2}.",
                $"{days90:N2} ({ratio:P0}) is more than 90 days overdue."
            };
        return new BusinessHealthDimensionDto("Payables", status, DescriptionFor(status, "Payables"), reasons);
    }

    private async Task<BusinessHealthDimensionDto> CashAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var cashFlow = await _financeReports.GetCashFlowAsync(from, to, ct);
        var status = cashFlow.ClosingCash < 0 ? HealthStatus.Critical
            : cashFlow.NetChange < 0 ? HealthStatus.Attention : HealthStatus.Healthy;
        var reasons = new List<string>
        {
            $"Net cash change this period is {cashFlow.NetChange:N2} (inflows {cashFlow.TotalInflows:N2}, outflows {cashFlow.TotalOutflows:N2}).",
            $"Closing cash position is {cashFlow.ClosingCash:N2}."
        };
        return new BusinessHealthDimensionDto("Finance", status, DescriptionFor(status, "Cash position"), reasons);
    }

    private async Task<BusinessHealthDimensionDto> ConstructionAsync(CancellationToken ct)
    {
        var packages = await _constructionReports.WorkPackageProgressAsync(null, null, ct);
        var withBudget = packages.Where(p => p.Budget is > 0).ToList();
        if (withBudget.Count == 0)
        {
            return new BusinessHealthDimensionDto("Construction", HealthStatus.Healthy, "No budgeted work packages to evaluate.", new List<string>());
        }

        var totalBudget = withBudget.Sum(p => p.Budget!.Value);
        var totalActual = withBudget.Sum(p => p.ActualExpenses);
        var variancePercent = (totalActual - totalBudget) / totalBudget * 100;
        var status = variancePercent >= 20 ? HealthStatus.Critical : variancePercent >= 10 ? HealthStatus.Attention : HealthStatus.Healthy;
        var overBudget = withBudget.Where(p => p.ActualExpenses > p.Budget).OrderByDescending(p => p.ActualExpenses - p.Budget!.Value).Take(3).ToList();
        var reasons = new List<string> { $"Construction expenses are {variancePercent:0.#}% over budget across {withBudget.Count} budgeted work packages." };
        reasons.AddRange(overBudget.Select(p => $"{p.Name} ({p.ProjectName}): {p.ActualExpenses:N2} actual vs {p.Budget:N2} budget."));
        return new BusinessHealthDimensionDto("Construction", status, DescriptionFor(status, "Construction budget"), reasons);
    }

    private async Task<BusinessHealthDimensionDto> RentalAsync(CancellationToken ct)
    {
        var leaseStatus = await _propertyReports.LeaseStatusAsync(ct);
        var activeLeases = leaseStatus.FirstOrDefault(s => s.Status == Domain.Property.LeaseStatus.Active)?.Count ?? 0;
        var overdue = await _propertyReports.OverdueRentAsync(ct);

        if (activeLeases == 0)
        {
            return new BusinessHealthDimensionDto("Rental", HealthStatus.Healthy, "No active leases to evaluate.", new List<string>());
        }

        var ratio = (decimal)overdue.Count / activeLeases;
        var status = ratio >= 0.3m ? HealthStatus.Critical : overdue.Count > 0 ? HealthStatus.Attention : HealthStatus.Healthy;
        var reasons = overdue.Count == 0
            ? new List<string> { "No overdue rent." }
            : new List<string>
            {
                $"{overdue.Count} of {activeLeases} active leases ({ratio:P0}) have overdue rent totalling {overdue.Sum(o => o.OutstandingAmount):N2}."
            };
        return new BusinessHealthDimensionDto("Rental", status, DescriptionFor(status, "Rental collections"), reasons);
    }

    private static string DescriptionFor(HealthStatus status, string label) => status switch
    {
        HealthStatus.Critical => $"{label} requires immediate attention.",
        HealthStatus.Attention => $"{label} requires attention.",
        _ => $"{label} is healthy."
    };
}
