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
[Route("api/v1/portal/owner")]
public class PortalOwnerController : PortalControllerBase
{
    private readonly IPortalOwnerService _service;

    public PortalOwnerController(IPortalOwnerService service, IPortalContext portalContext) : base(portalContext)
    {
        _service = service;
    }

    protected override string RequiredActorType => PortalActorTypes.PropertyOwner;

    [HttpGet("properties")]
    public async Task<IActionResult> ListProperties(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.ListPropertiesAsync(ct)));
    }

    [HttpGet("properties/{id:guid}")]
    public async Task<IActionResult> GetProperty(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var property = await _service.GetPropertyAsync(id, ct);
        return property.Succeeded ? Ok(ApiResponse.Ok(property.Value)) : NotFound(new { title = property.Error, status = 404 });
    }

    [HttpGet("rent-collected")]
    public async Task<IActionResult> GetRentCollected([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.GetRentCollectedAsync(from, to, ct)));
    }

    [HttpGet("overdue-rent")]
    public async Task<IActionResult> GetOverdueRent(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.GetOverdueRentAsync(ct)));
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenue([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.GetRevenueAsync(from, to, ct)));
    }

    [HttpGet("maintenance-requests")]
    public async Task<IActionResult> ListMaintenanceRequests([FromQuery] PagedRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListMaintenanceRequestsAsync(request, ct)));
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
