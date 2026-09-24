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

    [HttpGet("balance-sheet")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> BalanceSheet([FromQuery] DateOnly? asOf, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _reportService.GetBalanceSheetAsync(asOf, ct)));
    }

    [HttpGet("profit-and-loss")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> ProfitAndLoss([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _reportService.GetProfitAndLossAsync(from, to, ct)));
    }

    [HttpGet("cash-flow")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> CashFlow([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _reportService.GetCashFlowAsync(from, to, ct)));
    }
}
