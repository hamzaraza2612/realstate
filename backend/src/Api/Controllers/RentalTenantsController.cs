using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Tenants;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/tenants")]
public class RentalTenantsController : ApiControllerBase
{
    private readonly IRentalTenantService _tenantService;

    public RentalTenantsController(IRentalTenantService tenantService)
    {
        _tenantService = tenantService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] RentalTenantFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _tenantService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _tenantService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Create(CreateRentalTenantRequest request, CancellationToken ct)
    {
        var result = await _tenantService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateRentalTenantRequest request, CancellationToken ct)
    {
        var result = await _tenantService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _tenantService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
