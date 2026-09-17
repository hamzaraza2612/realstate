using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/crm/activities")]
public class ActivitiesController : ApiControllerBase
{
    private readonly IActivityService _activityService;

    public ActivitiesController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Crm.ActivityView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] ActivityFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _activityService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Crm.ActivityManage)]
    public async Task<IActionResult> Create(CreateActivityRequest request, CancellationToken ct)
    {
        var result = await _activityService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Crm.ActivityManage)]
    public async Task<IActionResult> Update(Guid id, UpdateActivityRequest request, CancellationToken ct)
    {
        var result = await _activityService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/complete")]
    [RequirePermission(Permissions.Crm.ActivityManage)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var result = await _activityService.CompleteAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Crm.ActivityManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _activityService.DeleteAsync(id, ct);
        return result.Succeeded ? NoContent() : NotFound(new { title = result.Error, status = 404 });
    }
}
