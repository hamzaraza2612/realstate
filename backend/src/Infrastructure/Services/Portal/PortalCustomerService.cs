using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class PortalCustomerService : IPortalCustomerService
{
    private readonly AppDbContext _db;
    private readonly IPortalContext _portalContext;
    private readonly IBookingService _bookingService;
    private readonly IPaymentPlanService _paymentPlanService;
    private readonly IPaymentService _paymentService;
    private readonly IDocumentService _documentService;
    private readonly INotificationService _notificationService;

    public PortalCustomerService(
        AppDbContext db, IPortalContext portalContext, IBookingService bookingService,
        IPaymentPlanService paymentPlanService, IPaymentService paymentService,
        IDocumentService documentService, INotificationService notificationService)
    {
        _db = db;
        _portalContext = portalContext;
        _bookingService = bookingService;
        _paymentPlanService = paymentPlanService;
        _paymentService = paymentService;
        _documentService = documentService;
        _notificationService = notificationService;
    }

    private Guid CustomerId => _portalContext.ActorId;

    public async Task<PagedResult<BookingDto>> ListBookingsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _bookingService.ListAsync(request, new BookingFilter(null, CustomerId, null, null, null), ct);

    public async Task<Result<BookingDto>> GetBookingAsync(Guid bookingId, CancellationToken ct = default)
    {
        var result = await _bookingService.GetAsync(bookingId, ct);
        if (!result.Succeeded || result.Value!.CustomerId != CustomerId)
        {
            return Result.Failure<BookingDto>("Booking not found.", "not_found");
        }
        return result;
    }

    public async Task<Result<PaymentPlanDto>> GetPaymentPlanAsync(Guid bookingId, CancellationToken ct = default)
    {
        var ownership = await GetBookingAsync(bookingId, ct);
        if (!ownership.Succeeded) return Result.Failure<PaymentPlanDto>(ownership.Error!, ownership.ErrorCode!);

        return await _paymentPlanService.GetByBookingAsync(bookingId, ct);
    }

    public async Task<Result<IReadOnlyList<PaymentDto>>> ListPaymentsForBookingAsync(Guid bookingId, CancellationToken ct = default)
    {
        var ownership = await GetBookingAsync(bookingId, ct);
        if (!ownership.Succeeded) return Result.Failure<IReadOnlyList<PaymentDto>>(ownership.Error!, ownership.ErrorCode!);

        return await _paymentService.ListByBookingAsync(bookingId, ct);
    }

    public async Task<IReadOnlyList<CustomerPortalPaymentRow>> ListAllPaymentsAsync(CancellationToken ct = default)
    {
        var bookings = await _db.Bookings.Where(b => b.CustomerId == CustomerId)
            .Select(b => new { b.Id, b.BookingNumber }).ToListAsync(ct);

        var rows = new List<CustomerPortalPaymentRow>();
        foreach (var booking in bookings)
        {
            var payments = await _paymentService.ListByBookingAsync(booking.Id, ct);
            if (payments.Succeeded)
            {
                rows.AddRange(payments.Value!.Select(p => new CustomerPortalPaymentRow(booking.Id, booking.BookingNumber, p)));
            }
        }

        return rows.OrderByDescending(r => r.Payment.PaymentDate).ToList();
    }

    public async Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default)
    {
        var results = new List<DocumentDto>();
        var pageAll = new PagedRequest { PageSize = 100 };

        var ownDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.Customer, CustomerId, null, null), ct);
        results.AddRange(ownDocs.Data);

        var bookingIds = await _db.Bookings.Where(b => b.CustomerId == CustomerId).Select(b => b.Id).ToListAsync(ct);
        foreach (var bookingId in bookingIds)
        {
            var bookingDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.Booking, bookingId, null, null), ct);
            results.AddRange(bookingDocs.Data);
        }

        return results;
    }

    public async Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var ownership = await VerifyDocumentOwnershipAsync(documentId, ct);
        if (!ownership.Succeeded) return Result.Failure<DownloadedFile>(ownership.Error!, ownership.ErrorCode!);

        return await _documentService.DownloadAsync(documentId, version, ct);
    }

    private async Task<Result> VerifyDocumentOwnershipAsync(Guid documentId, CancellationToken ct)
    {
        var detail = await _documentService.GetAsync(documentId, ct);
        if (!detail.Succeeded) return Result.Failure("Document not found.", "not_found");

        var doc = detail.Value!.Document;
        var owns = (doc.EntityType == DocumentEntityTypes.Customer && doc.EntityId == CustomerId) ||
                   (doc.EntityType == DocumentEntityTypes.Booking && await _db.Bookings.AnyAsync(b => b.Id == doc.EntityId && b.CustomerId == CustomerId, ct));

        return owns ? Result.Success() : Result.Failure("Document not found.", "not_found");
    }

    public async Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default) =>
        await _notificationService.ListAsync(request, filter, ct);

    public async Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default) =>
        await _notificationService.GetUnreadCountAsync(ct);

    public async Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default) =>
        await _notificationService.MarkReadAsync(id, ct);

    public async Task MarkAllNotificationsReadAsync(CancellationToken ct = default) =>
        await _notificationService.MarkAllReadAsync(ct);
}
