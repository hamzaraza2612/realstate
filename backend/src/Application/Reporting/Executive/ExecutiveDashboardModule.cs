namespace RealEstateErp.Application.Reporting.Executive;

/// <summary>
/// One tenant-scoped management view combining every module's headline numbers. Two different
/// kinds of figure are mixed here, deliberately kept distinguishable by name and documented per
/// field: (1) <b>period figures</b> — a sum over [<see cref="From"/>, <see cref="To"/>], inclusive,
/// against the field's own date column (BookingDate/PaymentDate/EntryDate/etc.); and
/// (2) <b>snapshot figures</b> — a balance or count "as of now" (server UTC date at request time),
/// independent of the requested period, the same way a balance sheet line is always as-of a moment
/// while a P&amp;L line is always over a period. Every figure is computed fresh from the same tables
/// the owning module's own dashboard/service already reads — nothing here is a second source of
/// truth, and nothing is invented for a module with no backing data (e.g. there is no "budget vs
/// actual" figure here because Project has no Budget field; see the Construction report for the
/// WorkPackage-level figure that IS backed).
/// </summary>
public record ExecutiveDashboardDto(
    DateOnly From,
    DateOnly To,

    // --- Period figures (sum over [From, To]) ---

    /// <summary>Sum of Booking.NetPrice for bookings with Status = Confirmed and BookingDate in
    /// [From, To]. Draft/PendingApproval/Cancelled bookings are excluded — this counts committed
    /// sales, not pipeline.</summary>
    decimal Sales,

    /// <summary>Sum of Sales Payment.Amount + Property RentPayment.Amount + Facility
    /// FacilityPayment.Amount with PaymentDate in [From, To] — every cash inflow the system
    /// records through a "Payment" entity, across all three revenue-generating modules.</summary>
    decimal Collections,

    /// <summary>Sum of Finance Profit &amp; Loss revenue lines (posted journal entries only) for
    /// [From, To] — reuses IFinanceReportService.GetProfitAndLossAsync, not recomputed.</summary>
    decimal Revenue,

    /// <summary>Sum of Finance Profit &amp; Loss expense lines for [From, To] — same source as Revenue.</summary>
    decimal Expenses,

    /// <summary>Revenue - Expenses for [From, To] (the P&amp;L's own NetIncome figure).</summary>
    decimal Profit,

    /// <summary>Sum of Property RentPayment.Amount with PaymentDate in [From, To].</summary>
    decimal RentalCollected,

    // --- Snapshot figures (as of now, independent of From/To) ---

    /// <summary>Sum of (Amount - PaidAmount) across Sales Installments not Cancelled and not fully
    /// paid, as of now. Sales-installment receivables only — rent and service-charge receivables
    /// are reported separately under Property/Facility, not folded in here, to avoid conflating
    /// three distinct billing models into one number.</summary>
    decimal Receivables,

    /// <summary>Sum of (Amount - PaidAmount) across Construction Expenses with Status = Approved,
    /// as of now. Pending/Rejected expenses are excluded — no Finance journal has posted for them,
    /// so they are not yet a real payable.</summary>
    decimal Payables,

    /// <summary>Closing balance of the Cash and Bank account as of <see cref="To"/> — reuses
    /// IFinanceReportService.GetCashFlowAsync(null, To).ClosingCash, not recomputed.</summary>
    decimal CashPosition,

    /// <summary>Count of Projects with Status = Active, as of now.</summary>
    int ActiveProjects,

    ExecutiveInventorySummaryDto Inventory,

    /// <summary>Property.PropertyUnit occupancy rate (Occupied / Total), as of now — reuses
    /// IPropertyDashboardService.GetAsync().OccupancyRate. Null when the tenant has zero units
    /// (rate is undefined, not zero).</summary>
    decimal? PropertyOccupancyRate,

    /// <summary>Sum of (Amount - PaidAmount) across RentSchedule rows not Cancelled, as of now.</summary>
    decimal RentalOutstanding,

    /// <summary>Average WorkPackage.ProgressPercent across work packages not Cancelled, as of now.
    /// Null when the tenant has zero non-cancelled work packages.</summary>
    decimal? ConstructionProgressPercent,

    /// <summary>Sum of PurchaseOrder.Total for orders in PendingApproval/Approved/Sent/
    /// PartiallyReceived — committed spend not yet fully received or cancelled, as of now.</summary>
    decimal ProcurementExposure,

    /// <summary>Count of MaintenanceRequest rows with Status in {Open, Assigned, InProgress,
    /// OnHold} — not yet Resolved/Cancelled, as of now. Spans both Property and Facility
    /// maintenance (the same underlying entity serves both).</summary>
    int MaintenanceBacklogCount,

    /// <summary>Total CRM Leads, as of now — reuses ICrmDashboardService.GetAsync().TotalLeads.</summary>
    int TotalLeads,

    /// <summary>Won leads / total leads * 100, as of now — reuses
    /// ICrmDashboardService.GetAsync().ConversionRatePercent, not recomputed.</summary>
    double LeadConversionRatePercent);

public record ExecutiveInventorySummaryDto(
    /// <summary>InventoryUnit.Status = Available, as of now.</summary>
    int Available,
    /// <summary>InventoryUnit.Status in {Reserved, Booked}, as of now.</summary>
    int Reserved,
    /// <summary>InventoryUnit.Status = Sold, as of now.</summary>
    int Sold,
    int Total);

public interface IExecutiveDashboardService
{
    Task<ExecutiveDashboardDto> GetAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
