using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/maintenance-requests")]
public class MaintenanceRequestsController : ApiControllerBase
{
    private readonly IMaintenanceService _maintenanceService;

    public MaintenanceRequestsController(IMaintenanceService maintenanceService)
    {
        _maintenanceService = maintenanceService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] MaintenanceRequestFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _maintenanceService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _maintenanceService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Property.MaintenanceManage)]
    public async Task<IActionResult> Create(CreateMaintenanceRequestRequest request, CancellationToken ct)
    {
        var result = await _maintenanceService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/assign")]
    [RequirePermission(Permissions.Property.MaintenanceManage)]
    public async Task<IActionResult> Assign(Guid id, AssignMaintenanceRequestRequest request, CancellationToken ct)
    {
        var result = await _maintenanceService.AssignAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Property.MaintenanceManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeMaintenanceStatusRequest request, CancellationToken ct)
    {
        var result = await _maintenanceService.ChangeStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
