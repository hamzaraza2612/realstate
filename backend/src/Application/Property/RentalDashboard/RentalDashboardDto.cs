namespace RealEstateErp.Application.Property.RentalDashboard;

public record LeaseExpiringDto(Guid LeaseId, string LeaseNumber, string UnitNumber, string TenantName, DateOnly EndDate);

public record RecentRentPaymentDto(Guid Id, string ReceiptNumber, string LeaseNumber, decimal Amount, DateOnly PaymentDate);

public record RentalDashboardDto(
    int ActiveLeases,
    IReadOnlyList<LeaseExpiringDto> UpcomingExpirations,
    decimal RentDue,
    decimal CollectedRent,
    decimal OutstandingRent,
    int OverdueObligations,
    int TotalUnits,
    int OccupiedUnits,
    IReadOnlyList<RecentRentPaymentDto> RecentPayments);
