using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[RequireEntitlement(EntitlementCodes.AdvancedReporting)]
[Route("api/v1/reports/construction")]
public class ConstructionReportsController : ApiControllerBase
{
    private readonly IConstructionReportService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public ConstructionReportsController(IConstructionReportService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("work-package-progress")]
    public async Task<IActionResult> WorkPackageProgress([FromQuery] Guid? projectId, [FromQuery] WorkPackageStatus? status, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.WorkPackageProgressAsync(projectId, status, ct);
        return RespondOrExport(rows, format, "work-package-progress");
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> Expenses([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ExpensesByCategoryAsync(from, to, projectId, ct);
        return RespondOrExport(rows, format, "construction-expenses-by-category");
    }

    [HttpGet("budget-vs-actual")]
    public async Task<IActionResult> BudgetVsActual([FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.BudgetVsActualAsync(projectId, ct);
        return RespondOrExport(rows, format, "budget-vs-actual");
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
