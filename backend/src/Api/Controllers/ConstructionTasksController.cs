using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Construction.Tasks;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/construction/tasks")]
public class ConstructionTasksController : ApiControllerBase
{
    private readonly IConstructionTaskService _taskService;

    public ConstructionTasksController(IConstructionTaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] ConstructionTaskFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _taskService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _taskService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Create(CreateConstructionTaskRequest request, CancellationToken ct)
    {
        var result = await _taskService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Update(Guid id, UpdateConstructionTaskRequest request, CancellationToken ct)
    {
        var result = await _taskService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeConstructionTaskStatusRequest request, CancellationToken ct)
    {
        var result = await _taskService.ChangeStatusAsync(id, request.Status, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _taskService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
