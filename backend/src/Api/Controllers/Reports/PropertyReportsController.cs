using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[RequireEntitlement(EntitlementCodes.AdvancedReporting)]
[Route("api/v1/reports/property")]
public class PropertyReportsController : ApiControllerBase
{
    private readonly IPropertyReportService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public PropertyReportsController(IPropertyReportService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("occupancy")]
    public async Task<IActionResult> Occupancy([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.OccupancyAsync(ct);
        return RespondOrExport(rows, format, "property-occupancy");
    }

    [HttpGet("rent-billed")]
    public async Task<IActionResult> RentBilled([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.RentBilledAsync(from, to, ct);
        return RespondOrExport(rows, format, "rent-billed");
    }

    [HttpGet("rent-collected")]
    public async Task<IActionResult> RentCollected([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.RentCollectedAsync(from, to, ct);
        return RespondOrExport(rows, format, "rent-collected");
    }

    [HttpGet("overdue-rent")]
    public async Task<IActionResult> OverdueRent([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.OverdueRentAsync(ct);
        return RespondOrExport(rows, format, "overdue-rent");
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.RevenueAsync(from, to, ct);
        return RespondOrExport(rows, format, "property-revenue");
    }

    [HttpGet("tenant-aging")]
    public async Task<IActionResult> TenantAging([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.TenantAgingAsync(ct);
        return RespondOrExport(rows, format, "tenant-aging");
    }

    [HttpGet("lease-status")]
    public async Task<IActionResult> LeaseStatus(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.LeaseStatusAsync(ct)));
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
