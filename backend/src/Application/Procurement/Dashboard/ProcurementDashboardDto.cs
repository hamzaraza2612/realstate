namespace RealEstateErp.Application.Procurement.Dashboard;

public record ProcurementDashboardDto(
    int PurchaseRequestsPendingApproval,
    int TotalPurchaseOrders,
    int PendingDeliveries,
    int PartiallyReceivedOrders,
    int ActiveVendors,
    decimal TotalProcurementValue,
    IReadOnlyList<RecentPurchaseOrderDto> RecentPurchaseOrders);

public record RecentPurchaseOrderDto(Guid Id, string PoNumber, string VendorName, int Status, decimal Total, DateTimeOffset CreatedAt);
