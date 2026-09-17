using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/inventory")]
public class InventoryController : ApiControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Inventory.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] InventoryFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _inventoryService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Inventory.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _inventoryService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Inventory.Manage)]
    public async Task<IActionResult> Create(CreateInventoryUnitRequest request, CancellationToken ct)
    {
        var result = await _inventoryService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Inventory.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateInventoryUnitRequest request, CancellationToken ct)
    {
        var result = await _inventoryService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Inventory.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _inventoryService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Inventory.Manage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeInventoryStatusRequest request, CancellationToken ct)
    {
        var result = await _inventoryService.ChangeStatusAsync(id, request, ct);
        if (result.Succeeded) return Ok(ApiResponse.Ok(result.Value));
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
