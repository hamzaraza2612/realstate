using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/sales/bookings/{bookingId:guid}/payment-plan")]
public class PaymentPlansController : ApiControllerBase
{
    private readonly IPaymentPlanService _paymentPlanService;

    public PaymentPlansController(IPaymentPlanService paymentPlanService)
    {
        _paymentPlanService = paymentPlanService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Sales.BookingView)]
    public async Task<IActionResult> Get(Guid bookingId, CancellationToken ct)
    {
        var result = await _paymentPlanService.GetByBookingAsync(bookingId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Sales.BookingCreate)]
    public async Task<IActionResult> Create(Guid bookingId, CreatePaymentPlanRequest request, CancellationToken ct)
    {
        var result = await _paymentPlanService.CreateAsync(bookingId, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
