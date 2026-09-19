using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/crm/leads")]
public class LeadsController : ApiControllerBase
{
    private readonly ILeadService _leadService;

    public LeadsController(ILeadService leadService)
    {
        _leadService = leadService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Crm.LeadView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] LeadFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _leadService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Crm.LeadView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _leadService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Crm.LeadCreate)]
    public async Task<IActionResult> Create(CreateLeadRequest request, CancellationToken ct)
    {
        var result = await _leadService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Crm.LeadUpdate)]
    public async Task<IActionResult> Update(Guid id, UpdateLeadRequest request, CancellationToken ct)
    {
        var result = await _leadService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Crm.LeadDelete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _leadService.DeleteAsync(id, ct);
        return result.Succeeded ? NoContent() : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/assign")]
    [RequirePermission(Permissions.Crm.LeadAssign)]
    public async Task<IActionResult> Assign(Guid id, AssignLeadRequest request, CancellationToken ct)
    {
        var result = await _leadService.AssignAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/convert")]
    [RequirePermission(Permissions.Crm.CustomerManage)]
    public async Task<IActionResult> Convert(Guid id, CancellationToken ct)
    {
        var result = await _leadService.ConvertToCustomerAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
