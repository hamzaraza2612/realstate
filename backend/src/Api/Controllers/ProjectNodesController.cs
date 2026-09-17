using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Projects.Hierarchy;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/projects/nodes")]
public class ProjectNodesController : ApiControllerBase
{
    private readonly IProjectNodeService _nodeService;

    public ProjectNodesController(IProjectNodeService nodeService)
    {
        _nodeService = nodeService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Projects.View)]
    public async Task<IActionResult> List([FromQuery] Guid projectId, CancellationToken ct)
    {
        var result = await _nodeService.ListByProjectAsync(projectId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Projects.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _nodeService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Create(CreateProjectNodeRequest request, CancellationToken ct)
    {
        var result = await _nodeService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateProjectNodeRequest request, CancellationToken ct)
    {
        var result = await _nodeService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _nodeService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
