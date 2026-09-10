using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Users;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/users")]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Users.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] string? search, CancellationToken ct)
    {
        var result = await _userService.ListAsync(request, search, ct);
        return Ok(ApiResponse.Paged(result));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Users.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _userService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Users.Manage)]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken ct)
    {
        var result = await _userService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Users.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request, CancellationToken ct)
    {
        var result = await _userService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/deactivate")]
    [RequirePermission(Permissions.Users.Manage)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var result = await _userService.DeactivateAsync(id, ct);
        return result.Succeeded ? NoContent() : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/roles")]
    [RequirePermission(Permissions.Users.Manage)]
    public async Task<IActionResult> AssignRoles(Guid id, AssignRolesRequest request, CancellationToken ct)
    {
        var result = await _userService.AssignRolesAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400 });
    }
}
