using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Receivables;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[Route("api/v1/reports/sales")]
public class SalesReportsController : ApiControllerBase
{
    private readonly ISalesReportService _service;
    private readonly IReceivableService _receivables;
    private readonly IEnumerable<IReportExporter> _exporters;

    public SalesReportsController(ISalesReportService service, IReceivableService receivables, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _receivables = receivables;
        _exporters = exporters;
    }

    [HttpGet("by-project")]
    public async Task<IActionResult> ByProject([FromQuery] SalesReportFilter filter, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.SalesByProjectAsync(filter, ct);
        return RespondOrExport(rows, format, "sales-by-project");
    }

    [HttpGet("by-period")]
    public async Task<IActionResult> ByPeriod([FromQuery] SalesReportFilter filter, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.SalesByPeriodAsync(filter, ct);
        return RespondOrExport(rows, format, "sales-by-period");
    }

    [HttpGet("by-agent")]
    public async Task<IActionResult> ByAgent([FromQuery] SalesReportFilter filter, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.SalesByAgentAsync(filter, ct);
        return RespondOrExport(rows, format, "sales-by-agent");
    }

    [HttpGet("booking-status")]
    public async Task<IActionResult> BookingStatus([FromQuery] SalesReportFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.BookingStatusBreakdownAsync(filter, ct)));
    }

    [HttpGet("conversion")]
    public async Task<IActionResult> Conversion([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.BookingConversionAsync(from, to, ct)));
    }

    [HttpGet("cancellations")]
    public async Task<IActionResult> Cancellations([FromQuery] PagedRequest request, [FromQuery] SalesReportFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.CancellationsAsync(request, filter, ct)));
    }

    [HttpGet("collections")]
    public async Task<IActionResult> Collections([FromQuery] SalesReportFilter filter, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.CollectionsAsync(filter, ct);
        return RespondOrExport(rows, format, "sales-collections");
    }

    /// <summary>Delegates directly to the existing Finance Receivables list — no duplicate logic.</summary>
    [HttpGet("outstanding-installments")]
    public async Task<IActionResult> OutstandingInstallments([FromQuery] PagedRequest request, [FromQuery] ReceivableFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _receivables.ListAsync(request, filter, ct)));
    }

    [HttpGet("receivable-aging")]
    public async Task<IActionResult> ReceivableAging([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ReceivableAgingAsync(ct);
        return RespondOrExport(rows, format, "sales-receivable-aging");
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
