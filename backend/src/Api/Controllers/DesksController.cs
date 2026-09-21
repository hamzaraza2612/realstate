using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/desks")]
public class DesksController : ApiControllerBase
{
    private readonly IDeskService _deskService;

    public DesksController(IDeskService deskService)
    {
        _deskService = deskService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] DeskFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _deskService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Create(CreateDeskRequest request, CancellationToken ct)
    {
        var result = await _deskService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Update(Guid id, UpdateDeskRequest request, CancellationToken ct)
    {
        var result = await _deskService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
