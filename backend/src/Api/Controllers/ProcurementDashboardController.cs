using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Procurement.Dashboard;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/procurement/dashboard")]
public class ProcurementDashboardController : ApiControllerBase
{
    private readonly IProcurementDashboardService _dashboardService;

    public ProcurementDashboardController(IProcurementDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(ct)));
    }
}
