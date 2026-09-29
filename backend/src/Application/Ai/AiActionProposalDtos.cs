using RealEstateErp.Domain.Ai;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Ai;

public record AiActionProposalDto(
    Guid Id, Guid? ConversationId, string ActionType, string? TargetEntityType, Guid? TargetEntityId,
    object Parameters, string Explanation, string ExpectedEffect, string RiskLevel,
    AiActionProposalStatus Status, Guid? ApprovalRequestId, object? Result, string? ErrorMessage,
    DateTimeOffset ExpiresAt, DateTimeOffset? ExecutedAt, DateTimeOffset CreatedAt);

public record AiActionProposalFilter(AiActionProposalStatus? Status);

/// <summary>
/// Creation/lookup for AI-proposed write actions — never contains an "Approve"/"Reject" method: those
/// are the EXISTING generic Approval Inbox's job (POST /api/v1/approvals/{id}/decide), reused as-is.
/// See AiActionProposalApprovalHandler (registered as an IApprovalLinkedEntityHandler) for how a
/// decision there drives ExecuteInternalAsync here. See docs/AI_ARCHITECTURE.md.
/// </summary>
public interface IAiActionProposalService
{
    Task<PagedResult<AiActionProposalDto>> ListMineAsync(PagedRequest request, AiActionProposalFilter filter, CancellationToken ct = default);

    Task<Result<AiActionProposalDto>> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Called by AiConversationService when a WRITE tool is invoked mid-conversation — never
    /// called directly from an HTTP endpoint (there is deliberately no "propose an arbitrary action"
    /// API surface; every proposal originates from an actual AI tool call).</summary>
    Task<Result<AiActionProposalDto>> CreateAsync(
        Guid? conversationId, string actionType, string parametersJson, string explanation,
        string expectedEffect, string riskLevel, string? targetEntityType, Guid? targetEntityId,
        CancellationToken ct = default);

    /// <summary>Invoked only by AiActionProposalApprovalHandler after the linked ApprovalRequest is
    /// approved — executes the tool named by ActionType with the frozen ParametersJson. Idempotent:
    /// calling this again on an already-Executed (or Failed) proposal returns the stored result
    /// without re-running the tool, so a retried/duplicated decision can never double-mutate.</summary>
    Task<Result<AiActionProposalDto>> ExecuteInternalAsync(Guid id, Guid executingUserId, CancellationToken ct = default);

    /// <summary>Invoked by AiActionProposalApprovalHandler when the linked ApprovalRequest is
    /// rejected.</summary>
    Task<Result<AiActionProposalDto>> MarkRejectedAsync(Guid id, CancellationToken ct = default);
}
