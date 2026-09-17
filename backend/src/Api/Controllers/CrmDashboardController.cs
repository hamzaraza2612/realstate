using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/crm/dashboard")]
public class CrmDashboardController : ApiControllerBase
{
    private readonly ICrmDashboardService _dashboardService;

    public CrmDashboardController(ICrmDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Crm.LeadView)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(ct)));
    }
}
