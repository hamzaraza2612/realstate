using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/sales/bookings")]
public class BookingsController : ApiControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Sales.BookingView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] BookingFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _bookingService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Sales.BookingView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Sales.BookingCreate)]
    public async Task<IActionResult> Create(CreateBookingRequest request, CancellationToken ct)
    {
        var result = await _bookingService.CreateAsync(request, ct);
        if (result.Succeeded) return CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value));
        return result.ErrorCode == "double_booking"
            ? Conflict(new { title = result.Error, status = 409, code = result.ErrorCode })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Sales.BookingCreate)]
    public async Task<IActionResult> Update(Guid id, UpdateBookingRequest request, CancellationToken ct)
    {
        var result = await _bookingService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/submit")]
    [RequirePermission(Permissions.Sales.BookingCreate)]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.SubmitForApprovalAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/approve")]
    [RequirePermission(Permissions.Sales.BookingApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.ApproveAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.Sales.BookingCancel)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.CancelAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
