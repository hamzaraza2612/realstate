using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

/// <summary>New Finance reports only (AR/AP aging, trends). Trial Balance/Income Summary/Balance
/// Sheet/P&amp;L/Cash Flow remain at their existing /finance/reports/* routes — not duplicated here.</summary>
[Authorize]
[RequirePermission(Permissions.Reports.View)]
[RequireEntitlement(EntitlementCodes.AdvancedReporting)]
[Route("api/v1/reports/finance")]
public class FinanceReportsExtController : ApiControllerBase
{
    private readonly IFinanceReportsExtensionService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public FinanceReportsExtController(IFinanceReportsExtensionService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("ar-aging")]
    public async Task<IActionResult> ArAging([FromQuery] string? format, CancellationToken ct)
    {
        var result = await _service.GetArAgingAsync(ct);
        if (!string.IsNullOrWhiteSpace(format))
        {
            var exported = ReportExport.TryExport(_exporters, format, result.Rows, "ar-aging");
            return exported as IActionResult ?? BadRequest(new { title = "Unsupported export format.", status = 400 });
        }
        return Ok(ApiResponse.Ok(result));
    }

    [HttpGet("ap-aging")]
    public async Task<IActionResult> ApAging([FromQuery] string? format, CancellationToken ct)
    {
        var result = await _service.GetApAgingAsync(ct);
        if (!string.IsNullOrWhiteSpace(format))
        {
            var exported = ReportExport.TryExport(_exporters, format, result.Rows, "ap-aging");
            return exported as IActionResult ?? BadRequest(new { title = "Unsupported export format.", status = 400 });
        }
        return Ok(ApiResponse.Ok(result));
    }

    [HttpGet("revenue-trend")]
    public async Task<IActionResult> RevenueTrend([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.GetRevenueTrendAsync(from, to, ct)));
    }

    [HttpGet("expense-trend")]
    public async Task<IActionResult> ExpenseTrend([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.GetExpenseTrendAsync(from, to, ct)));
    }

    [HttpGet("collections-trend")]
    public async Task<IActionResult> CollectionsTrend([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.GetCollectionsTrendAsync(from, to, ct)));
    }
}
