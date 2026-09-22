using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Reporting.Facility;

/// <summary>Occupied / Total Space per facility, as of now.</summary>
public record FacilityUtilizationRowDto(Guid FacilityId, string FacilityName, FacilityType Type, int TotalSpaces, int OccupiedSpaces, decimal OccupancyRate);

/// <summary>Shop (Space.Type = Shop) occupancy for ShoppingMall facilities specifically.</summary>
public record MallOccupancyRowDto(Guid FacilityId, string FacilityName, int TotalShops, int OccupiedShops, decimal OccupancyRate);

/// <summary>ServiceChargeCharge billed vs collected for [From, To] (DueDate), per facility.</summary>
public record ServiceChargeCollectionRowDto(Guid FacilityId, string FacilityName, decimal Billed, decimal Collected, decimal Outstanding);

/// <summary>Sum of FacilityPayment.Amount in [From, To], per facility, broken down by source type
/// (ServiceCharge/Parking/CoworkingMembership/CoworkingBooking/Utility) — this is the Facility
/// module's own revenue, kept separate from Property's rent revenue (see PropertyRevenueRowDto).</summary>
public record FacilityRevenueRowDto(Guid FacilityId, string FacilityName, decimal Total, IReadOnlyDictionary<string, decimal> BySourceType);

/// <summary>Parking occupancy (Allocated / Total ParkingSpace), as of now, per facility.</summary>
public record ParkingUtilizationRowDto(Guid FacilityId, string FacilityName, int TotalSpaces, int AllocatedSpaces, decimal OccupancyRate);

public record EventSummaryRowDto(Guid FacilityId, string FacilityName, int UpcomingCount, int PastCount);

/// <summary>Desk occupancy (Occupied / Total Desk), as of now, per facility.</summary>
public record CoworkingDeskUtilizationRowDto(Guid FacilityId, string FacilityName, int TotalDesks, int OccupiedDesks, decimal OccupancyRate);

/// <summary>Booked hours per MeetingRoom over [From, To] (Booking.StartAt), counting
/// Confirmed/Completed bookings only (Pending hasn't happened yet, Cancelled didn't happen).</summary>
public record MeetingRoomUtilizationRowDto(Guid MeetingRoomId, string RoomName, Guid FacilityId, string FacilityName, decimal BookedHours, int BookingCount);

/// <summary>Coworking (Desk + MeetingRoom) booking counts per day over [From, To], for a trend chart.</summary>
public record BookingTrendRowDto(DateOnly Date, int BookingCount);

/// <summary>MaintenanceRequest rows scoped to a Facility (FacilityId not null) — the Property
/// equivalent (FacilityId null) is out of this report's scope; see Property reports for that half
/// of the shared MaintenanceRequest table. Backlog = not yet Resolved/Cancelled, aged from
/// ReportedDate, broken down by Priority.</summary>
public record MaintenanceBacklogRowDto(Guid RequestId, string RequestNumber, Guid? FacilityId, string FacilityName, MaintenancePriority Priority, MaintenanceStatus Status, int AgeInDays, Guid? AssignedVendorId, string? AssignedVendorName);

public interface IFacilityReportService
{
    Task<IReadOnlyList<FacilityUtilizationRowDto>> UtilizationAsync(CancellationToken ct = default);
    Task<IReadOnlyList<MallOccupancyRowDto>> MallOccupancyAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ServiceChargeCollectionRowDto>> ServiceChargeCollectionAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<FacilityRevenueRowDto>> RevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<ParkingUtilizationRowDto>> ParkingUtilizationAsync(CancellationToken ct = default);
    Task<IReadOnlyList<EventSummaryRowDto>> EventSummaryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CoworkingDeskUtilizationRowDto>> CoworkingDeskUtilizationAsync(CancellationToken ct = default);
    Task<IReadOnlyList<MeetingRoomUtilizationRowDto>> MeetingRoomUtilizationAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<BookingTrendRowDto>> BookingTrendsAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceBacklogRowDto>> MaintenanceBacklogAsync(CancellationToken ct = default);
}
