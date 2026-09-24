using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/mall/notices")]
public class TenantNoticesController : ApiControllerBase
{
    private readonly ITenantNoticeService _noticeService;

    public TenantNoticesController(ITenantNoticeService noticeService)
    {
        _noticeService = noticeService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] TenantNoticeFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _noticeService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Create(CreateTenantNoticeRequest request, CancellationToken ct)
    {
        var result = await _noticeService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeTenantNoticeStatusRequest request, CancellationToken ct)
    {
        var result = await _noticeService.ChangeStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
