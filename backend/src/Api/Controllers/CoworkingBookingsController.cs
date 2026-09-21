using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/bookings")]
public class CoworkingBookingsController : ApiControllerBase
{
    private readonly IBookingService _bookingService;

    public CoworkingBookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] BookingFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _bookingService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Create(CreateBookingRequest request, CancellationToken ct)
    {
        var result = await _bookingService.CreateAsync(request, ct);
        if (result.Succeeded) return CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value));
        return result.ErrorCode == "overlapping_booking"
            ? Conflict(new { title = result.Error, status = 409, code = result.ErrorCode })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeBookingStatusRequest request, CancellationToken ct)
    {
        var result = await _bookingService.ChangeStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
