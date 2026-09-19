using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Procurement.PurchaseRequests;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/procurement/purchase-requests")]
public class PurchaseRequestsController : ApiControllerBase
{
    private readonly IPurchaseRequestService _purchaseRequestService;

    public PurchaseRequestsController(IPurchaseRequestService purchaseRequestService)
    {
        _purchaseRequestService = purchaseRequestService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] PurchaseRequestFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _purchaseRequestService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _purchaseRequestService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Procurement.RequestCreate)]
    public async Task<IActionResult> Create(CreatePurchaseRequestRequest request, CancellationToken ct)
    {
        var result = await _purchaseRequestService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Procurement.RequestCreate)]
    public async Task<IActionResult> Update(Guid id, UpdatePurchaseRequestRequest request, CancellationToken ct)
    {
        var result = await _purchaseRequestService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/submit")]
    [RequirePermission(Permissions.Procurement.RequestCreate)]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct)
    {
        var result = await _purchaseRequestService.SubmitAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/approve")]
    [RequirePermission(Permissions.Procurement.RequestApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var result = await _purchaseRequestService.ApproveAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/reject")]
    [RequirePermission(Permissions.Procurement.RequestApprove)]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var result = await _purchaseRequestService.RejectAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.Procurement.RequestCreate)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _purchaseRequestService.CancelAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
