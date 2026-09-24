using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/mall/shops")]
public class MallShopsController : ApiControllerBase
{
    private readonly IMallShopService _mallShopService;

    public MallShopsController(IMallShopService mallShopService)
    {
        _mallShopService = mallShopService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] MallShopFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _mallShopService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{spaceId:guid}")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> Get(Guid spaceId, CancellationToken ct)
    {
        var result = await _mallShopService.GetAsync(spaceId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Create(CreateMallShopRequest request, CancellationToken ct)
    {
        var result = await _mallShopService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { spaceId = result.Value!.SpaceId }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{spaceId:guid}")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Update(Guid spaceId, UpdateMallShopRequest request, CancellationToken ct)
    {
        var result = await _mallShopService.UpdateAsync(spaceId, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
