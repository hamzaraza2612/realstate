using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Executive;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[Route("api/v1/reports/executive")]
public class ExecutiveReportController : ApiControllerBase
{
    private readonly IExecutiveDashboardService _service;

    public ExecutiveReportController(IExecutiveDashboardService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.GetAsync(from, to, ct)));
    }
}
