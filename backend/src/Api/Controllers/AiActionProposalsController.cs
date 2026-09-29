using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Ai;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// Read-only visibility into AI-proposed write actions the caller requested — approving/rejecting one
/// is NOT done here. That happens on the existing generic Approval Inbox
/// (POST /api/v1/approvals/{id}/decide, using the proposal's ApprovalRequestId), which
/// AiActionProposalApprovalHandler then routes back into execution. See docs/AI_ARCHITECTURE.md.
/// </summary>
[Authorize]
[RequireEntitlement(EntitlementCodes.Ai)]
[Route("api/v1/ai/action-proposals")]
public class AiActionProposalsController : ApiControllerBase
{
    private readonly IAiActionProposalService _proposalService;

    public AiActionProposalsController(IAiActionProposalService proposalService)
    {
        _proposalService = proposalService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] AiActionProposalFilter filter, CancellationToken ct) =>
        Ok(ApiResponse.Paged(await _proposalService.ListMineAsync(request, filter, ct)));

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _proposalService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
