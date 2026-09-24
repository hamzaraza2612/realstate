using RealEstateErp.Domain.Sales;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Reporting.Sales;

/// <summary>Shared filter for every Sales report below. Date range applies to Booking.BookingDate
/// unless a method's own doc comment says otherwise (Collections filters on Payment.PaymentDate).
/// All filters are optional and combine with AND.</summary>
public record SalesReportFilter(DateOnly? From, DateOnly? To, Guid? ProjectId, Guid? AgentUserId, Guid? CustomerId, BookingStatus? Status);

public record SalesByProjectRowDto(Guid ProjectId, string ProjectName, int BookingCount, decimal TotalNetPrice);

public record SalesByPeriodRowDto(int Year, int Month, int BookingCount, decimal TotalNetPrice);

public record SalesByAgentRowDto(Guid AgentUserId, string AgentName, int BookingCount, decimal TotalNetPrice);

public record BookingStatusBreakdownRowDto(BookingStatus Status, int Count, decimal TotalNetPrice);

/// <summary>Lead funnel over CreatedAt in [From, To], plus the resulting conversion rate. Mirrors
/// ICrmDashboardService's ConversionRatePercent formula (WonLeads / TotalLeads * 100) exactly, but
/// scoped to a caller-chosen period instead of all-time.</summary>
public record BookingConversionDto(
    DateOnly From, DateOnly To,
    IReadOnlyDictionary<string, int> LeadsByStatus,
    int TotalLeads,
    int WonLeads,
    double ConversionRatePercent);

/// <summary>One cancelled booking. Booking has no cancellation-reason field, so none is reported —
/// this is a list of what was lost (project/customer/value), not why.</summary>
public record CancellationRowDto(Guid BookingId, string BookingNumber, Guid ProjectId, string ProjectName, Guid CustomerId, string CustomerName, decimal NetPrice, DateOnly BookingDate);

/// <summary>One day's total Sales collections (Payment.PaymentDate = Date), for a trend chart.</summary>
public record CollectionsRowDto(DateOnly Date, decimal Amount, int PaymentCount);

/// <summary>One customer's outstanding Sales-installment balance, split into aging buckets by
/// days past DueDate (using PaymentPlan.GracePeriodDays the same way PaymentPlanService.EffectiveStatus
/// does, so "overdue" here matches what the Booking/Payment Plan screens already show). Cancelled
/// installments are excluded; fully-paid installments contribute nothing (their outstanding is 0).</summary>
public record ReceivableAgingRowDto(
    Guid CustomerId, string CustomerName,
    decimal Current, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Days90Plus,
    decimal Total);

public interface ISalesReportService
{
    Task<IReadOnlyList<SalesByProjectRowDto>> SalesByProjectAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<SalesByPeriodRowDto>> SalesByPeriodAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<SalesByAgentRowDto>> SalesByAgentAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<BookingStatusBreakdownRowDto>> BookingStatusBreakdownAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<BookingConversionDto> BookingConversionAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<PagedResult<CancellationRowDto>> CancellationsAsync(PagedRequest request, SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<CollectionsRowDto>> CollectionsAsync(SalesReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<ReceivableAgingRowDto>> ReceivableAgingAsync(CancellationToken ct = default);
}
