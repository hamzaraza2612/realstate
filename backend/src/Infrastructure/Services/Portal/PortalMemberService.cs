using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class PortalMemberService : IPortalMemberService
{
    private readonly IPortalContext _portalContext;
    private readonly IMembershipService _membershipService;
    private readonly IBookingService _bookingService;
    private readonly IDocumentService _documentService;
    private readonly INotificationService _notificationService;

    public PortalMemberService(
        IPortalContext portalContext, IMembershipService membershipService, IBookingService bookingService,
        IDocumentService documentService, INotificationService notificationService)
    {
        _portalContext = portalContext;
        _membershipService = membershipService;
        _bookingService = bookingService;
        _documentService = documentService;
        _notificationService = notificationService;
    }

    private Guid MemberId => _portalContext.ActorId;

    public async Task<Result<MembershipDto>> GetActiveMembershipAsync(CancellationToken ct = default)
    {
        var page = await _membershipService.ListAsync(new PagedRequest { PageSize = 20 }, new MembershipFilter(MemberId, null, MembershipStatus.Active), ct);
        var active = page.Data.FirstOrDefault();
        return active is null
            ? Result.Failure<MembershipDto>("No active membership.", "not_found")
            : Result.Success(active);
    }

    public async Task<PagedResult<MembershipDto>> ListMembershipsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _membershipService.ListAsync(request, new MembershipFilter(MemberId, null, null), ct);

    public async Task<PagedResult<BookingDto>> ListBookingsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _bookingService.ListAsync(request, new BookingFilter(MemberId, null, null, null), ct);

    public async Task<Result<BookingDto>> GetBookingAsync(Guid bookingId, CancellationToken ct = default)
    {
        var result = await _bookingService.GetAsync(bookingId, ct);
        if (!result.Succeeded || result.Value!.MemberId != MemberId)
        {
            return Result.Failure<BookingDto>("Booking not found.", "not_found");
        }
        return result;
    }

    public async Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default)
    {
        var result = await _documentService.ListAsync(new PagedRequest { PageSize = 100 }, new DocumentFilter(DocumentEntityTypes.CoworkingMember, MemberId, null, null), ct);
        return result.Data;
    }

    public async Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var detail = await _documentService.GetAsync(documentId, ct);
        if (!detail.Succeeded) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        var doc = detail.Value!.Document;
        if (doc.EntityType != DocumentEntityTypes.CoworkingMember || doc.EntityId != MemberId)
        {
            return Result.Failure<DownloadedFile>("Document not found.", "not_found");
        }

        return await _documentService.DownloadAsync(documentId, version, ct);
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
