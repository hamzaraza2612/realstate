using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/procurement/purchase-orders")]
public class PurchaseOrdersController : ApiControllerBase
{
    private readonly IPurchaseOrderService _purchaseOrderService;

    public PurchaseOrdersController(IPurchaseOrderService purchaseOrderService)
    {
        _purchaseOrderService = purchaseOrderService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] PurchaseOrderFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _purchaseOrderService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _purchaseOrderService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Create(CreatePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _purchaseOrderService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Update(Guid id, UpdatePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _purchaseOrderService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/submit")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct)
    {
        var result = await _purchaseOrderService.SubmitAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/approve")]
    [RequirePermission(Permissions.Procurement.OrderApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var result = await _purchaseOrderService.ApproveAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/send")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Send(Guid id, CancellationToken ct)
    {
        var result = await _purchaseOrderService.SendAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _purchaseOrderService.CancelAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
