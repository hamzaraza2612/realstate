using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/mall/events")]
public class FacilityEventsController : ApiControllerBase
{
    private readonly IFacilityEventService _eventService;

    public FacilityEventsController(IFacilityEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] FacilityEventFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _eventService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Create(CreateFacilityEventRequest request, CancellationToken ct)
    {
        var result = await _eventService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeFacilityEventStatusRequest request, CancellationToken ct)
    {
        var result = await _eventService.ChangeStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
