using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/rooms")]
public class MeetingRoomsController : ApiControllerBase
{
    private readonly IMeetingRoomService _roomService;

    public MeetingRoomsController(IMeetingRoomService roomService)
    {
        _roomService = roomService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] MeetingRoomFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _roomService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Create(CreateMeetingRoomRequest request, CancellationToken ct)
    {
        var result = await _roomService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Update(Guid id, UpdateMeetingRoomRequest request, CancellationToken ct)
    {
        var result = await _roomService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
