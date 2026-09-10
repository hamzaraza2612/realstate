using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Roles;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/roles")]
public class RolesController : ApiControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Roles.View)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _roleService.ListAsync(ct)));
    }

    [HttpGet("~/api/v1/permissions")]
    [RequirePermission(Permissions.Roles.View)]
    public async Task<IActionResult> ListPermissions(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _roleService.ListPermissionsAsync(ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Roles.Manage)]
    public async Task<IActionResult> Create(CreateRoleRequest request, CancellationToken ct)
    {
        var result = await _roleService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Roles.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateRoleRequest request, CancellationToken ct)
    {
        var result = await _roleService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Roles.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _roleService.DeleteAsync(id, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
