using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

public enum BookingResourceType
{
    Desk = 0,
    MeetingRoom = 1
}

public enum BookingStatus
{
    Pending = 0,
    Confirmed = 1,
    Completed = 2,
    Cancelled = 3
}

/// <summary>A time-boxed reservation of a Desk or MeetingRoom by a CoworkingMember. Overlap prevention is
/// enforced both here (an application-level pre-check) and by a DB-level Postgres EXCLUDE constraint on
/// (ResourceType, ResourceId, [StartAt,EndAt)) for non-cancelled bookings — the same defense-in-depth
/// pattern as Sales' double-booking guard and Procurement's over-receiving guard.</summary>
public class Booking : TenantEntity
{
    public Guid MemberId { get; set; }
    public BookingResourceType ResourceType { get; set; }
    public Guid ResourceId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Pending -> Confirmed -> Completed; Cancelled reachable from Pending/Confirmed.</summary>
public static class BookingStatusRules
{
    private static readonly Dictionary<BookingStatus, BookingStatus[]> Allowed = new()
    {
        [BookingStatus.Pending] = new[] { BookingStatus.Confirmed, BookingStatus.Cancelled },
        [BookingStatus.Confirmed] = new[] { BookingStatus.Completed, BookingStatus.Cancelled },
        [BookingStatus.Completed] = Array.Empty<BookingStatus>(),
        [BookingStatus.Cancelled] = Array.Empty<BookingStatus>(),
    };

    public static bool CanTransition(BookingStatus from, BookingStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
