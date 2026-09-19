using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Construction.WorkPackages;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/construction/work-packages")]
public class WorkPackagesController : ApiControllerBase
{
    private readonly IWorkPackageService _workPackageService;

    public WorkPackagesController(IWorkPackageService workPackageService)
    {
        _workPackageService = workPackageService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] WorkPackageFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _workPackageService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _workPackageService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Create(CreateWorkPackageRequest request, CancellationToken ct)
    {
        var result = await _workPackageService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Update(Guid id, UpdateWorkPackageRequest request, CancellationToken ct)
    {
        var result = await _workPackageService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeWorkPackageStatusRequest request, CancellationToken ct)
    {
        var result = await _workPackageService.ChangeStatusAsync(id, request.Status, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _workPackageService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
