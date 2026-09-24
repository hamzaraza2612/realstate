using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/plans")]
public class MembershipPlansController : ApiControllerBase
{
    private readonly IMembershipPlanService _planService;

    public MembershipPlansController(IMembershipPlanService planService)
    {
        _planService = planService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] MembershipPlanFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _planService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Create(CreateMembershipPlanRequest request, CancellationToken ct)
    {
        var result = await _planService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Update(Guid id, UpdateMembershipPlanRequest request, CancellationToken ct)
    {
        var result = await _planService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
