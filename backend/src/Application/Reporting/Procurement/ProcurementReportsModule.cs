using RealEstateErp.Domain.Procurement;

namespace RealEstateErp.Application.Reporting.Procurement;

/// <summary>Exposure = committed spend not yet fully received or cancelled — same status set the
/// Executive Dashboard's ProcurementExposure KPI uses (PendingApproval, Approved, Sent,
/// PartiallyReceived), grouped by vendor here instead of summed tenant-wide.</summary>
public record PurchaseOrderExposureRowDto(Guid VendorId, string VendorName, int OrderCount, decimal TotalExposure);

/// <summary>One PO line's ordered vs received quantity — OutstandingQuantity is what's still owed
/// by the vendor.</summary>
public record ReceivedVsOrderedRowDto(
    Guid PurchaseOrderId, string PoNumber, string ItemDescription,
    decimal OrderedQuantity, decimal ReceivedQuantity, decimal OutstandingQuantity);

/// <summary>Vendor spend = sum of PurchaseOrder.Total for orders in [From, To] (OrderDate),
/// regardless of status — this is committed order value, not necessarily cash paid (Construction
/// Expense/AP tracks actual cash spend separately).</summary>
public record VendorSpendRowDto(Guid VendorId, string VendorName, int OrderCount, decimal TotalSpend);

public record ProcurementStatusRowDto(PurchaseOrderStatus Status, int Count, decimal TotalValue);

public interface IProcurementReportService
{
    Task<IReadOnlyList<PurchaseOrderExposureRowDto>> PurchaseOrderExposureAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ReceivedVsOrderedRowDto>> ReceivedVsOrderedAsync(Guid? purchaseOrderId, CancellationToken ct = default);
    Task<IReadOnlyList<VendorSpendRowDto>> VendorSpendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<ProcurementStatusRowDto>> StatusBreakdownAsync(CancellationToken ct = default);
}
