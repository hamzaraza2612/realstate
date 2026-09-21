using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/dashboard")]
public class CoworkingDashboardController : ApiControllerBase
{
    private readonly ICoworkingDashboardService _dashboardService;

    public CoworkingDashboardController(ICoworkingDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> Get([FromQuery] Guid? facilityId, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(facilityId, ct)));
    }
}
