using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Approvals;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/approvals")]
public class ApprovalsController : ApiControllerBase
{
    private readonly IApprovalService _approvalService;

    public ApprovalsController(IApprovalService approvalService)
    {
        _approvalService = approvalService;
    }

    /// <summary>My inbox — object-scoped to the caller inside the service, no permission gate needed.</summary>
    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox([FromQuery] PagedRequest request, [FromQuery] ApprovalRequestFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _approvalService.ListMyInboxAsync(request, filter, ct)));
    }

    [HttpGet("entity")]
    [RequirePermission(Permissions.Approvals.View)]
    public async Task<IActionResult> ForEntity([FromQuery] string entityType, [FromQuery] Guid entityId, CancellationToken ct)
    {
        var result = await _approvalService.ListForEntityAsync(entityType, entityId, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400 });
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Approvals.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _approvalService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    /// <summary>Direct creation is exposed for the reusable foundation itself; existing modules
    /// (Expense/PurchaseOrder/Booking) create requests internally via IApprovalService, not this
    /// endpoint. Any authenticated user may request approval of their own action — authorization for
    /// who may *decide* it is enforced in DecideAsync, not here.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateApprovalRequestRequest request, CancellationToken ct)
    {
        var result = await _approvalService.CreateRequestAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    /// <summary>Authorization (named approver, or holds RequiredPermission) and duplicate/concurrent
    /// decision protection both live inside ApprovalService.DecideAsync — no [RequirePermission] here,
    /// since the valid permission depends on which request this is, not a single fixed code.</summary>
    [HttpPost("{id:guid}/decide")]
    public async Task<IActionResult> Decide(Guid id, DecideApprovalRequestRequest request, CancellationToken ct)
    {
        var result = await _approvalService.DecideAsync(id, request, ct);
        if (result.Succeeded) return Ok(ApiResponse.Ok(result.Value));
        return result.ErrorCode == "forbidden"
            ? StatusCode(403, new { title = result.Error, status = 403, code = result.ErrorCode })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
