namespace RealEstateErp.Application.Sales.Dashboard;

public record SalesDashboardDto(
    int TotalBookings,
    int DraftBookings,
    int PendingApprovalBookings,
    int ConfirmedBookings,
    int CancelledBookings,
    int AvailableInventory,
    int ReservedOrBookedInventory,
    int SoldInventory,
    decimal TotalBookingValue,
    decimal CollectedAmount,
    decimal OutstandingAmount,
    int OverdueInstallments,
    IReadOnlyList<RecentBookingDto> RecentBookings);

public record RecentBookingDto(
    Guid Id,
    string BookingNumber,
    string CustomerName,
    string ProjectName,
    string InventoryUnitCode,
    int Status,
    decimal NetPrice,
    DateTimeOffset CreatedAt);
