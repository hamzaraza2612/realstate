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
[Route("api/v1/portal/tenant")]
public class PortalTenantController : PortalControllerBase
{
    private readonly IPortalTenantService _service;

    public PortalTenantController(IPortalTenantService service, IPortalContext portalContext) : base(portalContext)
    {
        _service = service;
    }

    protected override string RequiredActorType => PortalActorTypes.RentalTenant;

    [HttpGet("leases")]
    public async Task<IActionResult> ListLeases([FromQuery] PagedRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListLeasesAsync(request, ct)));
    }

    [HttpGet("leases/{id:guid}")]
    public async Task<IActionResult> GetLease(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var lease = await _service.GetLeaseAsync(id, ct);
        return lease.Succeeded ? Ok(ApiResponse.Ok(lease.Value)) : NotFound(new { title = lease.Error, status = 404 });
    }

    [HttpGet("leases/{id:guid}/rent-schedule")]
    public async Task<IActionResult> GetRentSchedule(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var schedule = await _service.GetRentScheduleAsync(id, ct);
        return schedule.Succeeded ? Ok(ApiResponse.Ok(schedule.Value)) : NotFound(new { title = schedule.Error, status = 404 });
    }

    [HttpGet("leases/{id:guid}/payments")]
    public async Task<IActionResult> ListPaymentsForLease(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var payments = await _service.ListPaymentsForLeaseAsync(id, ct);
        return payments.Succeeded ? Ok(ApiResponse.Ok(payments.Value)) : NotFound(new { title = payments.Error, status = 404 });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> ListAllPayments(CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Ok(await _service.ListAllPaymentsAsync(ct)));
    }

    [HttpGet("leases/{id:guid}/security-deposit")]
    public async Task<IActionResult> GetSecurityDeposit(Guid id, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var deposit = await _service.GetSecurityDepositAsync(id, ct);
        return deposit.Succeeded ? Ok(ApiResponse.Ok(deposit.Value)) : NotFound(new { title = deposit.Error, status = 404 });
    }

    [HttpGet("maintenance-requests")]
    public async Task<IActionResult> ListMaintenanceRequests([FromQuery] PagedRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        return Ok(ApiResponse.Paged(await _service.ListMaintenanceRequestsAsync(request, ct)));
    }

    [HttpPost("maintenance-requests")]
    public async Task<IActionResult> CreateMaintenanceRequest(CreateTenantMaintenanceRequest request, CancellationToken ct)
    {
        if (WrongActorType(out var result)) return result;
        var created = await _service.CreateMaintenanceRequestAsync(request, ct);
        return created.Succeeded
            ? Ok(ApiResponse.Ok(created.Value))
            : BadRequest(new { title = created.Error, status = 400, code = created.ErrorCode });
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
