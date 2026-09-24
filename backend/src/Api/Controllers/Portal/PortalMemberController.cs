using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers.Portal;

[RequirePortal]
[Route("api/v1/portal/member")]
public class PortalMemberController : PortalControllerBase
{
    private readonly IPortalMemberService _service;

    public PortalMemberController(IPortalMemberService service, IPortalContext portalContext) : base(portalContext)
    {
        _service = service;
    }

    protected override string RequiredActorType => PortalActorTypes.CoworkingMember;

    [HttpGet("membership")]
    public async Task<IActionResult> GetActiveMembership(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var membership = await _service.GetActiveMembershipAsync(ct);
        return membership.Succeeded ? Ok(ApiResponse.Ok(membership.Value)) : NotFound(new { title = membership.Error, status = 404 });
    }

    [HttpGet("memberships")]
    public async Task<IActionResult> ListMemberships([FromQuery] PagedRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListMembershipsAsync(request, ct)));
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> ListBookings([FromQuery] PagedRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListBookingsAsync(request, ct)));
    }

    [HttpGet("bookings/{id:guid}")]
    public async Task<IActionResult> GetBooking(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var booking = await _service.GetBookingAsync(id, ct);
        return booking.Succeeded ? Ok(ApiResponse.Ok(booking.Value)) : NotFound(new { title = booking.Error, status = 404 });
    }

    [HttpGet("documents")]
    public async Task<IActionResult> ListDocuments(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.ListDocumentsAsync(ct)));
    }

    [HttpGet("documents/{id:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id, [FromQuery] int? version, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var download = await _service.DownloadDocumentAsync(id, version, ct);
        if (!download.Succeeded) return NotFound(new { title = download.Error, status = 404 });
        var file = download.Value!;
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> ListNotifications([FromQuery] PagedRequest request, [FromQuery] NotificationFilter filter, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListNotificationsAsync(request, filter, ct)));
    }

    [HttpGet("notifications/unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.GetUnreadNotificationCountAsync(ct)));
    }

    [HttpPost("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var marked = await _service.MarkNotificationReadAsync(id, ct);
        return marked.Succeeded ? Ok(ApiResponse.Ok(marked.Value)) : NotFound(new { title = marked.Error, status = 404 });
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        await _service.MarkAllNotificationsReadAsync(ct);
        return NoContent();
    }
}
