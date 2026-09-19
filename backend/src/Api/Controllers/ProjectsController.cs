using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Projects.Projects;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/projects")]
public class ProjectsController : ApiControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Projects.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] ProjectFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _projectService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Projects.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _projectService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var result = await _projectService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateProjectRequest request, CancellationToken ct)
    {
        var result = await _projectService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Projects.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _projectService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
