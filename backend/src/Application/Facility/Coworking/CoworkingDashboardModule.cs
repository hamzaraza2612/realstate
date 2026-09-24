namespace RealEstateErp.Application.Facility.Coworking;

public record UpcomingBookingDto(Guid Id, string MemberName, string ResourceLabel, DateTimeOffset StartAt, DateTimeOffset EndAt);

public record CoworkingDashboardDto(
    int TotalDesks,
    int OccupiedDesks,
    int AvailableDesks,
    decimal Occupancy,
    int ActiveMembers,
    decimal MembershipRevenue,
    int MeetingRoomBookings,
    IReadOnlyList<UpcomingBookingDto> UpcomingBookings,
    decimal UtilizationSummary,
    int OpenMaintenanceOrServiceRequests);

public interface ICoworkingDashboardService
{
    Task<CoworkingDashboardDto> GetAsync(Guid? facilityId, CancellationToken ct = default);
}
