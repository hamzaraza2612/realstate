using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/sales/bookings/{bookingId:guid}/payments")]
public class PaymentsController : ApiControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Sales.BookingView)]
    public async Task<IActionResult> List(Guid bookingId, CancellationToken ct)
    {
        var result = await _paymentService.ListByBookingAsync(bookingId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Sales.PaymentRecord)]
    public async Task<IActionResult> Record(Guid bookingId, RecordPaymentRequest request, CancellationToken ct)
    {
        var result = await _paymentService.RecordAsync(bookingId, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
