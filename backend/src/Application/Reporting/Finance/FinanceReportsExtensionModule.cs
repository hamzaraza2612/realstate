namespace RealEstateErp.Application.Reporting.Finance;

/// <summary>
/// New Finance-facing reports not covered by the existing IFinanceReportService (Trial Balance/
/// Income Summary/Balance Sheet/P&amp;L/Cash Flow — those remain reachable at their own
/// /finance/reports/* routes and are not re-exposed here to avoid two routes for the same data).
/// </summary>
public record ArAgingCustomerRowDto(
    Guid CustomerId, string CustomerName,
    decimal Current, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Days90Plus,
    decimal Total);

/// <summary>AR aging is per-customer (Sales.Customer via Booking); AR here means Sales-installment
/// receivables only, the same scope as the Executive Dashboard's Receivables figure and the
/// existing Finance Receivables list — see ArAgingCustomerRowDto's bucket fields for the
/// definition (days past DueDate + PaymentPlan.GracePeriodDays, as of now).</summary>
public record ArAgingReportDto(IReadOnlyList<ArAgingCustomerRowDto> Rows, decimal TotalOutstanding);

/// <summary>One vendor's outstanding Construction Expense balance. Expense has no separate due
/// date, so aging is computed from ExpenseDate directly (documented explicitly since this differs
/// from AR aging's DueDate+grace-period basis) — only Approved expenses are payables at all
/// (Pending/Rejected have no Finance posting and are not yet a real obligation).</summary>
public record ApAgingVendorRowDto(
    Guid VendorId, string VendorName,
    decimal Current, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Days90Plus,
    decimal Total);

public record ApAgingReportDto(IReadOnlyList<ApAgingVendorRowDto> Rows, decimal TotalOutstanding);

/// <summary>One calendar month's total, for a trend chart. Revenue/Expense trends reuse the exact
/// same posted-journal-line classification as Finance's own Profit &amp; Loss report (Credit-Debit
/// for Revenue accounts, Debit-Credit for Expense accounts) — just grouped by month here instead of
/// summed over one period.</summary>
public record MonthlyTrendRowDto(int Year, int Month, decimal Amount);

public interface IFinanceReportsExtensionService
{
    Task<ArAgingReportDto> GetArAgingAsync(CancellationToken ct = default);
    Task<ApAgingReportDto> GetApAgingAsync(CancellationToken ct = default);
    Task<IReadOnlyList<MonthlyTrendRowDto>> GetRevenueTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<MonthlyTrendRowDto>> GetExpenseTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);

    /// <summary>Collections trend combines Sales Payment + Property RentPayment + Facility
    /// FacilityPayment amounts by month — the cash-inflow figures behind the Executive Dashboard's
    /// Collections KPI, broken out over time instead of summed for one period.</summary>
    Task<IReadOnlyList<MonthlyTrendRowDto>> GetCollectionsTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
