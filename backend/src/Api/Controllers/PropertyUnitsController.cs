using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Units;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/units")]
public class PropertyUnitsController : ApiControllerBase
{
    private readonly IPropertyUnitService _unitService;

    public PropertyUnitsController(IPropertyUnitService unitService)
    {
        _unitService = unitService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] PropertyUnitFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _unitService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _unitService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Create(CreatePropertyUnitRequest request, CancellationToken ct)
    {
        var result = await _unitService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdatePropertyUnitRequest request, CancellationToken ct)
    {
        var result = await _unitService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangePropertyUnitStatusRequest request, CancellationToken ct)
    {
        var result = await _unitService.ChangeStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _unitService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
