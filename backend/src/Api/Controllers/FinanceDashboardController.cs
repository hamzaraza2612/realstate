using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Dashboard;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/dashboard")]
public class FinanceDashboardController : ApiControllerBase
{
    private readonly IFinanceDashboardService _dashboardService;

    public FinanceDashboardController(IFinanceDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(ct)));
    }
}
