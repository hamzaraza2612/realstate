using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
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

    public NotificationsController(INotificationService notificationService, INotificationPreferenceService preferenceService)
    {
        _notificationService = notificationService;
        _preferenceService = preferenceService;
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
}
