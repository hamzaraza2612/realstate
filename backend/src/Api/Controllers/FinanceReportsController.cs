using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/reports")]
public class FinanceReportsController : ApiControllerBase
{
    private readonly IFinanceReportService _reportService;

    public FinanceReportsController(IFinanceReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("trial-balance")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> TrialBalance(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _reportService.GetTrialBalanceAsync(ct)));
    }

    [HttpGet("income-summary")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> IncomeSummary([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _reportService.GetIncomeSummaryAsync(from, to, ct)));
    }
}
