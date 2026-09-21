using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Payments;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/payments")]
public class FacilityPaymentsController : ApiControllerBase
{
    private readonly IFacilityPaymentService _facilityPaymentService;

    public FacilityPaymentsController(IFacilityPaymentService facilityPaymentService)
    {
        _facilityPaymentService = facilityPaymentService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> ListBySource([FromQuery] FacilityPaymentSourceType sourceType, [FromQuery] Guid sourceId, CancellationToken ct)
    {
        var result = await _facilityPaymentService.ListBySourceAsync(sourceType, sourceId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.PaymentRecord)]
    public async Task<IActionResult> Record(RecordFacilityPaymentRequest request, CancellationToken ct)
    {
        var result = await _facilityPaymentService.RecordAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
