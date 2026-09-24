using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/mall/parking")]
public class ParkingController : ApiControllerBase
{
    private readonly IParkingService _parkingService;

    public ParkingController(IParkingService parkingService)
    {
        _parkingService = parkingService;
    }

    [HttpGet("spaces")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> ListSpaces([FromQuery] PagedRequest request, [FromQuery] ParkingSpaceFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _parkingService.ListSpacesAsync(request, filter, ct)));
    }

    [HttpPost("spaces")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> CreateSpace(CreateParkingSpaceRequest request, CancellationToken ct)
    {
        var result = await _parkingService.CreateSpaceAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("allocations")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> ListAllocations([FromQuery] PagedRequest request, [FromQuery] ParkingAllocationFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _parkingService.ListAllocationsAsync(request, filter, ct)));
    }

    [HttpPost("allocations")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Allocate(CreateParkingAllocationRequest request, CancellationToken ct)
    {
        var result = await _parkingService.AllocateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("allocations/{id:guid}/end")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> End(Guid id, CancellationToken ct)
    {
        var result = await _parkingService.EndAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
