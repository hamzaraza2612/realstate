namespace RealEstateErp.Application.Facility.Dashboard;

public record UtilityTypeSummaryDto(string Type, decimal TotalConsumption, decimal TotalAmount);
public record UpcomingFacilityEventDto(Guid Id, string Title, Guid FacilityId, string FacilityName, DateTimeOffset StartAt);

public record FacilityDashboardDto(
    int TotalFacilities,
    int TotalSpaces,
    int OccupiedSpaces,
    int AvailableSpaces,
    decimal OccupancyRate,
    int ActiveTenantsOrMembers,
    int OpenMaintenanceRequests,
    int OpenServiceRequests,
    decimal TotalRevenue,
    decimal OutstandingReceivables,
    IReadOnlyList<UtilityTypeSummaryDto> UtilitySummary,
    IReadOnlyList<UpcomingFacilityEventDto> UpcomingEvents);

public interface IFacilityDashboardService
{
    Task<FacilityDashboardDto> GetAsync(CancellationToken ct = default);
}
