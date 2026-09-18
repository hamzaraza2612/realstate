namespace RealEstateErp.Domain.Sales;

/// <summary>Valid booking status transitions: Draft → PendingApproval → Confirmed, with Cancelled reachable from any non-terminal state.</summary>
public static class BookingStatusRules
{
    private static readonly Dictionary<BookingStatus, BookingStatus[]> Allowed = new()
    {
        [BookingStatus.Draft] = new[] { BookingStatus.PendingApproval, BookingStatus.Cancelled },
        [BookingStatus.PendingApproval] = new[] { BookingStatus.Confirmed, BookingStatus.Cancelled },
        [BookingStatus.Confirmed] = new[] { BookingStatus.Cancelled },
        [BookingStatus.Cancelled] = Array.Empty<BookingStatus>(),
    };

    public static bool CanTransition(BookingStatus from, BookingStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
