using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Procurement;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[Route("api/v1/reports/procurement")]
public class ProcurementReportsController : ApiControllerBase
{
    private readonly IProcurementReportService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public ProcurementReportsController(IProcurementReportService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("purchase-order-exposure")]
    public async Task<IActionResult> PurchaseOrderExposure([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.PurchaseOrderExposureAsync(ct);
        return RespondOrExport(rows, format, "purchase-order-exposure");
    }

    [HttpGet("received-vs-ordered")]
    public async Task<IActionResult> ReceivedVsOrdered([FromQuery] Guid? purchaseOrderId, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ReceivedVsOrderedAsync(purchaseOrderId, ct);
        return RespondOrExport(rows, format, "received-vs-ordered");
    }

    [HttpGet("vendor-spend")]
    public async Task<IActionResult> VendorSpend([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.VendorSpendAsync(from, to, ct);
        return RespondOrExport(rows, format, "vendor-spend");
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.StatusBreakdownAsync(ct)));
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
