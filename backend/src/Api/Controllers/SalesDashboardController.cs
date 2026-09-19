using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Sales.Dashboard;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/sales/dashboard")]
public class SalesDashboardController : ApiControllerBase
{
    private readonly ISalesDashboardService _dashboardService;

    public SalesDashboardController(ISalesDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Sales.BookingView)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(ct)));
    }
}
