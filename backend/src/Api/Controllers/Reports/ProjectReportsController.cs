using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Projects;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[Route("api/v1/reports/projects")]
public class ProjectReportsController : ApiControllerBase
{
    private readonly IProjectReportService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public ProjectReportsController(IProjectReportService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("inventory-availability")]
    public async Task<IActionResult> InventoryAvailability([FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.InventoryAvailabilityAsync(projectId, ct);
        return RespondOrExport(rows, format, "inventory-availability");
    }

    [HttpGet("sold-vs-available")]
    public async Task<IActionResult> SoldVsAvailable([FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.SoldVsAvailableAsync(projectId, ct);
        return RespondOrExport(rows, format, "sold-vs-available");
    }

    [HttpGet("sales-summary")]
    public async Task<IActionResult> SalesSummary([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.SalesSummaryAsync(from, to, projectId, ct);
        return RespondOrExport(rows, format, "project-sales-summary");
    }

    [HttpGet("collection-summary")]
    public async Task<IActionResult> CollectionSummary([FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.CollectionSummaryAsync(projectId, ct);
        return RespondOrExport(rows, format, "project-collection-summary");
    }

    [HttpGet("financial-summary")]
    public async Task<IActionResult> FinancialSummary([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.FinancialSummaryAsync(from, to, projectId, ct);
        return RespondOrExport(rows, format, "project-financial-summary");
    }

    [HttpGet("progress")]
    public async Task<IActionResult> Progress([FromQuery] Guid? projectId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ProgressAsync(projectId, ct);
        return RespondOrExport(rows, format, "project-progress");
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
