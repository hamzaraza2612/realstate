using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

/// <summary>
/// Customer Portal — every method reuses the existing Sales/Documents services and DTOs verbatim
/// (BookingDto/PaymentPlanDto/PaymentDto/DocumentDto), adding only the ownership check that a bare
/// GetAsync(id) on those services doesn't perform: the caller's own CustomerId, resolved from
/// IPortalContext, is checked against the returned row before it's handed back — never accepted as a
/// client-supplied filter. A booking that exists but belongs to a different customer (same tenant or,
/// via the tenant filter, impossible for another tenant) comes back as not_found, the same convention
/// the rest of the codebase already uses for a row outside the caller's tenant.
/// </summary>
public record CustomerPortalPaymentRow(Guid BookingId, string BookingNumber, PaymentDto Payment);

public interface IPortalCustomerService
{
    Task<PagedResult<BookingDto>> ListBookingsAsync(PagedRequest request, CancellationToken ct = default);
    Task<Result<BookingDto>> GetBookingAsync(Guid bookingId, CancellationToken ct = default);
    Task<Result<PaymentPlanDto>> GetPaymentPlanAsync(Guid bookingId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<PaymentDto>>> ListPaymentsForBookingAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Payment history across every one of the caller's own bookings, newest first — the one
    /// genuinely new read shape here (the existing IPaymentService only lists per-booking).</summary>
    Task<IReadOnlyList<CustomerPortalPaymentRow>> ListAllPaymentsAsync(CancellationToken ct = default);

    /// <summary>Documents attached to the caller's own Customer record plus every one of their own
    /// bookings — calls IDocumentService.ListAsync once per (EntityType, EntityId) pair, no new
    /// document table or query.</summary>
    Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default);

    /// <summary>Ownership-checked wrapper over IDocumentService.DownloadAsync — verifies the document's
    /// (EntityType, EntityId) is the caller's own Customer row or one of their own bookings before
    /// downloading, since Documents.View/Manage are tenant-wide permissions a Customer never holds.</summary>
    Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default);

    Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}
