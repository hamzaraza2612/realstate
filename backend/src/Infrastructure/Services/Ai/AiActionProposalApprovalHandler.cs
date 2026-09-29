using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Approvals;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// Wires the existing generic Approval Inbox's Decide action to AiActionProposal execution — this is
/// the ENTIRE integration; there is no separate "approve an AI action" API endpoint. When a reviewer
/// clicks Approve/Reject on an ApprovalRequest with EntityType="AiActionProposal", ApprovalService
/// (already having independently re-verified the decider is the named approver or holds
/// RequiredPermission) calls ApplyDecisionAsync here with EntityId = the AiActionProposal's own id.
/// </summary>
public class AiActionProposalApprovalHandler : IApprovalLinkedEntityHandler
{
    private readonly IAiActionProposalService _proposalService;
    private readonly IApprovalService _approvalService;

    public AiActionProposalApprovalHandler(IAiActionProposalService proposalService, IApprovalService approvalService)
    {
        _proposalService = proposalService;
        _approvalService = approvalService;
    }

    public string EntityType => "AiActionProposal";

    public async Task ApplyDecisionAsync(Guid entityId, bool approved, CancellationToken ct)
    {
        if (!approved)
        {
            await _proposalService.MarkRejectedAsync(entityId, ct);
            return;
        }

        var history = await _approvalService.ListForEntityAsync(EntityType, entityId, ct);
        var decidedByUserId = history.Value?.OrderByDescending(a => a.DecidedAt).FirstOrDefault(a => a.DecidedByUserId.HasValue)?.DecidedByUserId;
        if (decidedByUserId is null) return;

        await _proposalService.ExecuteInternalAsync(entityId, decidedByUserId.Value, ct);
    }
}
