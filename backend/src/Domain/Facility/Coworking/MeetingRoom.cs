using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

/// <summary>Availability is time-slot based (see Booking), not a permanent state flag — a room isn't
/// marked "Occupied" the way a Desk can be; Status here only covers the out-of-service states.</summary>
public enum MeetingRoomStatus
{
    Available = 0,
    Maintenance = 1,
    Inactive = 2
}

public class MeetingRoom : TenantEntity
{
    public Guid SpaceId { get; set; }
    public string Name { get; set; } = default!;
    public int Capacity { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? DailyRate { get; set; }
    public MeetingRoomStatus Status { get; set; } = MeetingRoomStatus.Available;
}
