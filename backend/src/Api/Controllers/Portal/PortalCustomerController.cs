using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers.Portal;

/// <summary>Every action here additionally checks IPortalContext.ActorType == Customer, so a Vendor's
/// or RentalTenant's portal token — valid on the shared PortalOnly policy — still can't reach a
/// Customer-shaped endpoint.</summary>
[RequirePortal]
[Route("api/v1/portal/customer")]
public class PortalCustomerController : PortalControllerBase
{
    private readonly IPortalCustomerService _service;

    public PortalCustomerController(IPortalCustomerService service, IPortalContext portalContext) : base(portalContext)
    {
        _service = service;
    }

    protected override string RequiredActorType => PortalActorTypes.Customer;

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

    [HttpGet("bookings/{id:guid}/payment-plan")]
    public async Task<IActionResult> GetPaymentPlan(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var plan = await _service.GetPaymentPlanAsync(id, ct);
        return plan.Succeeded ? Ok(ApiResponse.Ok(plan.Value)) : NotFound(new { title = plan.Error, status = 404 });
    }

    [HttpGet("bookings/{id:guid}/payments")]
    public async Task<IActionResult> ListPaymentsForBooking(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var payments = await _service.ListPaymentsForBookingAsync(id, ct);
        return payments.Succeeded ? Ok(ApiResponse.Ok(payments.Value)) : NotFound(new { title = payments.Error, status = 404 });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> ListAllPayments(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.ListAllPaymentsAsync(ct)));
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
