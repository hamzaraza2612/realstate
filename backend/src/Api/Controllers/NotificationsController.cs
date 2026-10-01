using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// No [RequirePermission] on any action here, deliberately — every action is scoped to the caller's
/// own UserId inside NotificationService/NotificationPreferenceService (a user can only ever see or
/// change their own notifications/preferences), which is a stronger, more correct check than a role
/// permission would add on top. [Authorize] (any authenticated tenant user) is the only gate needed.
/// </summary>
[Authorize]
[Route("api/v1/notifications")]
public class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly INotificationPreferenceService _preferenceService;
    private readonly IDeviceRegistrationService _deviceRegistrationService;
    private readonly ITenantContext _tenantContext;

    public NotificationsController(
        INotificationService notificationService, INotificationPreferenceService preferenceService,
        IDeviceRegistrationService deviceRegistrationService, ITenantContext tenantContext)
    {
        _notificationService = notificationService;
        _preferenceService = preferenceService;
        _deviceRegistrationService = deviceRegistrationService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] NotificationFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _notificationService.ListAsync(request, filter, ct)));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _notificationService.GetUnreadCountAsync(ct)));
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var result = await _notificationService.MarkReadAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await _notificationService.MarkAllReadAsync(ct);
        return NoContent();
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _preferenceService.GetMineAsync(ct)));
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreference(UpdateNotificationPreferenceRequest request, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _preferenceService.UpdateMineAsync(request, ct)));
    }

    /// <summary>Device-registration half of the Milestone 18 push seam — stores a token only, never
    /// sends a push. See IDeviceRegistrationService's doc comment.</summary>
    [HttpPost("device-tokens")]
    public async Task<IActionResult> RegisterDeviceToken(RegisterDeviceTokenRequest request, CancellationToken ct)
    {
        var result = await _deviceRegistrationService.RegisterAsync(_tenantContext.UserId ?? Guid.Empty, isPortalOwner: false, request, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
