namespace RealEstateErp.Application.Reporting.Projects;

/// <summary>Per-project InventoryUnit counts by status, as of now.</summary>
public record InventoryAvailabilityRowDto(
    Guid ProjectId, string ProjectName,
    int Available, int Reserved, int Booked, int Sold, int Blocked, int UnderConstruction, int HandedOver, int Total);

/// <summary>A simpler two-way cut of the same data: Sold vs everything not yet sold.</summary>
public record SoldVsAvailableRowDto(Guid ProjectId, string ProjectName, int Sold, int Available, int Total, decimal SoldPercent);

/// <summary>Confirmed-booking totals for a project over [From, To] (BookingDate) — same inclusion
/// rule as the Sales "sales by project" report (Confirmed only).</summary>
public record ProjectSalesSummaryRowDto(Guid ProjectId, string ProjectName, int BookingCount, decimal TotalNetPrice);

/// <summary>Collected vs outstanding across all of a project's bookings' installments, as of now
/// (a balance, not period-summed — see Executive Dashboard's Receivables doc for why balances are
/// always as-of-now rather than period sums).</summary>
public record ProjectCollectionSummaryRowDto(Guid ProjectId, string ProjectName, decimal TotalInstallments, decimal Collected, decimal Outstanding);

/// <summary>Direct project profitability: Confirmed-booking sales revenue over [From, To] minus
/// Approved Construction Expenses for the same project over the same range. This is a gross,
/// direct-cost margin only — it does NOT allocate shared overhead, corporate costs, or
/// Procurement commitments not yet expensed, since none of those are tracked per-project in the
/// current domain model. Treat as a directional profitability signal, not a full P&amp;L.</summary>
public record ProjectFinancialSummaryRowDto(Guid ProjectId, string ProjectName, decimal SalesRevenue, decimal ConstructionExpenses, decimal GrossMargin);

/// <summary>Average WorkPackage.ProgressPercent for the project's own work packages (excluding
/// Cancelled), as of now. Null when the project has zero non-cancelled work packages — Construction
/// hasn't started tracking progress for it yet, not 0%.</summary>
public record ProjectProgressRowDto(Guid ProjectId, string ProjectName, decimal? ProgressPercent, int WorkPackageCount);

public interface IProjectReportService
{
    Task<IReadOnlyList<InventoryAvailabilityRowDto>> InventoryAvailabilityAsync(Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<SoldVsAvailableRowDto>> SoldVsAvailableAsync(Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectSalesSummaryRowDto>> SalesSummaryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectCollectionSummaryRowDto>> CollectionSummaryAsync(Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectFinancialSummaryRowDto>> FinancialSummaryAsync(DateOnly? from, DateOnly? to, Guid? projectId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectProgressRowDto>> ProgressAsync(Guid? projectId, CancellationToken ct = default);
}
