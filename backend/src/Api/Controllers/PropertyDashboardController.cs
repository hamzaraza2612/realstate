using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Dashboard;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/dashboard")]
public class PropertyDashboardController : ApiControllerBase
{
    private readonly IPropertyDashboardService _dashboardService;

    public PropertyDashboardController(IPropertyDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _dashboardService.GetAsync(ct)));
    }
}
