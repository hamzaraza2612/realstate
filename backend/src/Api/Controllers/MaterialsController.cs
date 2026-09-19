using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Materials;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/materials")]
public class MaterialsController : ApiControllerBase
{
    private readonly IMaterialService _materialService;

    public MaterialsController(IMaterialService materialService)
    {
        _materialService = materialService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] MaterialFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _materialService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _materialService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Create(CreateMaterialRequest request, CancellationToken ct)
    {
        var result = await _materialService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Update(Guid id, UpdateMaterialRequest request, CancellationToken ct)
    {
        var result = await _materialService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _materialService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/movements")]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> ListMovements(Guid id, CancellationToken ct)
    {
        var result = await _materialService.ListMovementsAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/movements")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> RecordMovement(Guid id, CreateStockMovementRequest request, CancellationToken ct)
    {
        var result = await _materialService.RecordMovementAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
