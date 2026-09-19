using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Procurement.Receiving;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/procurement/purchase-orders/{purchaseOrderId:guid}/receipts")]
public class MaterialReceiptsController : ApiControllerBase
{
    private readonly IReceiptService _receiptService;

    public MaterialReceiptsController(IReceiptService receiptService)
    {
        _receiptService = receiptService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> List(Guid purchaseOrderId, CancellationToken ct)
    {
        var result = await _receiptService.ListByPurchaseOrderAsync(purchaseOrderId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Create(Guid purchaseOrderId, CreateMaterialReceiptRequest request, CancellationToken ct)
    {
        var result = await _receiptService.CreateAsync(purchaseOrderId, request, ct);
        if (result.Succeeded) return Ok(ApiResponse.Ok(result.Value));
        return result.ErrorCode == "over_receiving"
            ? Conflict(new { title = result.Error, status = 409, code = result.ErrorCode })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
