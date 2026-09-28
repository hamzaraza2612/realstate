using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Reporting.Facility;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers.Reports;

[Authorize]
[RequirePermission(Permissions.Reports.View)]
[RequireEntitlement(EntitlementCodes.AdvancedReporting)]
[Route("api/v1/reports/facility")]
public class FacilityReportsController : ApiControllerBase
{
    private readonly IFacilityReportService _service;
    private readonly IEnumerable<IReportExporter> _exporters;

    public FacilityReportsController(IFacilityReportService service, IEnumerable<IReportExporter> exporters)
    {
        _service = service;
        _exporters = exporters;
    }

    [HttpGet("utilization")]
    public async Task<IActionResult> Utilization([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.UtilizationAsync(ct);
        return RespondOrExport(rows, format, "facility-utilization");
    }

    [HttpGet("mall-occupancy")]
    public async Task<IActionResult> MallOccupancy([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.MallOccupancyAsync(ct);
        return RespondOrExport(rows, format, "mall-occupancy");
    }

    [HttpGet("service-charge-collection")]
    public async Task<IActionResult> ServiceChargeCollection([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ServiceChargeCollectionAsync(from, to, ct);
        return RespondOrExport(rows, format, "service-charge-collection");
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.RevenueAsync(from, to, ct);
        return RespondOrExport(rows, format, "facility-revenue");
    }

    [HttpGet("parking")]
    public async Task<IActionResult> Parking([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.ParkingUtilizationAsync(ct);
        return RespondOrExport(rows, format, "parking-utilization");
    }

    [HttpGet("events")]
    public async Task<IActionResult> Events(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.EventSummaryAsync(ct)));
    }

    [HttpGet("coworking-desk-utilization")]
    public async Task<IActionResult> CoworkingDeskUtilization([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.CoworkingDeskUtilizationAsync(ct);
        return RespondOrExport(rows, format, "coworking-desk-utilization");
    }

    [HttpGet("meeting-room-utilization")]
    public async Task<IActionResult> MeetingRoomUtilization([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.MeetingRoomUtilizationAsync(from, to, ct);
        return RespondOrExport(rows, format, "meeting-room-utilization");
    }

    [HttpGet("booking-trends")]
    public async Task<IActionResult> BookingTrends([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.BookingTrendsAsync(from, to, ct)));
    }

    [HttpGet("maintenance-backlog")]
    public async Task<IActionResult> MaintenanceBacklog([FromQuery] string? format, CancellationToken ct)
    {
        var rows = await _service.MaintenanceBacklogAsync(ct);
        return RespondOrExport(rows, format, "facility-maintenance-backlog");
    }

    private IActionResult RespondOrExport<T>(IReadOnlyList<T> rows, string? format, string fileBaseName)
    {
        var exported = ReportExport.TryExport(_exporters, format, rows, fileBaseName);
        if (exported != null) return exported;
        if (!string.IsNullOrWhiteSpace(format)) return BadRequest(new { title = "Unsupported export format.", status = 400 });
        return Ok(ApiResponse.Ok(rows));
    }
}
