namespace RealEstateErp.Application.Property.Dashboard;

public record PropertyPerformanceDto(
    Guid PropertyId,
    string PropertyName,
    int TotalUnits,
    int OccupiedUnits,
    decimal MonthlyRentalIncome,
    decimal OutstandingRent);

public record PropertyDashboardDto(
    int TotalProperties,
    int TotalUnits,
    int OccupiedUnits,
    int AvailableUnits,
    decimal OccupancyRate,
    int ActiveLeases,
    int ExpiringLeases,
    decimal MonthlyRentalIncome,
    decimal OutstandingRent,
    decimal OverdueRent,
    int OpenMaintenanceRequests,
    IReadOnlyList<PropertyPerformanceDto> PropertyPerformance);
