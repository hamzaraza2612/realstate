namespace RealEstateErp.Application.Facility.Mall;

public record MallDashboardDto(
    int TotalShops,
    int OccupiedShops,
    int VacantShops,
    decimal OccupancyRate,
    int ActiveTenants,
    decimal RentDue,
    decimal RentCollected,
    decimal ServiceChargesOutstanding,
    int ParkingOccupied,
    int ParkingTotal,
    int OpenMaintenanceRequests,
    int UpcomingEvents,
    int UnacknowledgedNotices,
    decimal RevenueSummary);

public interface IMallDashboardService
{
    Task<MallDashboardDto> GetAsync(Guid? facilityId, CancellationToken ct = default);
}
