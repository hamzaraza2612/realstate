using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/coworking/members")]
public class CoworkingMembersController : ApiControllerBase
{
    private readonly ICoworkingMemberService _memberService;

    public CoworkingMembersController(ICoworkingMemberService memberService)
    {
        _memberService = memberService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] CoworkingMemberFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _memberService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _memberService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Create(CreateCoworkingMemberRequest request, CancellationToken ct)
    {
        var result = await _memberService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Facility.CoworkingManage)]
    public async Task<IActionResult> Update(Guid id, UpdateCoworkingMemberRequest request, CancellationToken ct)
    {
        var result = await _memberService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
