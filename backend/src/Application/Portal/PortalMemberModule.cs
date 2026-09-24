using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

/// <summary>
/// Coworking Member Portal — reuses IMembershipService/IBookingService (Coworking)/IMembershipPlanService
/// exactly as-is, filtered to the caller's own MemberId (an existing supported filter field on both
/// MembershipFilter and Coworking BookingFilter — no service change needed). Payment history is
/// intentionally not included: unlike Sales/Property, Facility billing (ServiceCharge/Parking/
/// CoworkingMembership/CoworkingBooking/Utility) has no "list payments for X" read service today (only
/// a write-side FacilityPaymentService) — the Amount/PaidAmount already on MembershipDto/BookingDto
/// covers what balance is owed, without fabricating a payment ledger view that doesn't exist yet.
/// </summary>
public interface IPortalMemberService
{
    Task<Result<MembershipDto>> GetActiveMembershipAsync(CancellationToken ct = default);
    Task<PagedResult<MembershipDto>> ListMembershipsAsync(PagedRequest request, CancellationToken ct = default);

    Task<PagedResult<BookingDto>> ListBookingsAsync(PagedRequest request, CancellationToken ct = default);
    Task<Result<BookingDto>> GetBookingAsync(Guid bookingId, CancellationToken ct = default);

    Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default);
    Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default);

    Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}
