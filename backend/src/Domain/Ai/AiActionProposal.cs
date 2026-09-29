using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Ai;

/// <summary>
/// The lifecycle of one AI-proposed write action. Never executes on creation — see
/// docs/AI_ARCHITECTURE.md's action-proposal-lifecycle section. Integrates with the existing generic
/// Milestone-11 ApprovalRequest (via ApprovalRequestId) for the actual approve/reject decision rather
/// than reimplementing approval — this entity's own Status tracks the broader lifecycle the plain
/// ApprovalRequest can't express (Executed/Failed/Expired), while ApprovalRequest still owns "who
/// decided it and when."
/// </summary>
public enum AiActionProposalStatus
{
    PendingApproval = 0,
    Approved = 1,
    Rejected = 2,
    Executed = 3,
    Failed = 4,
    Expired = 5,
    Cancelled = 6
}

public static class AiActionProposalStatusRules
{
    private static readonly Dictionary<AiActionProposalStatus, AiActionProposalStatus[]> Allowed = new()
    {
        [AiActionProposalStatus.PendingApproval] = new[] { AiActionProposalStatus.Approved, AiActionProposalStatus.Rejected, AiActionProposalStatus.Expired, AiActionProposalStatus.Cancelled },
        [AiActionProposalStatus.Approved] = new[] { AiActionProposalStatus.Executed, AiActionProposalStatus.Failed },
        [AiActionProposalStatus.Rejected] = Array.Empty<AiActionProposalStatus>(),
        [AiActionProposalStatus.Executed] = Array.Empty<AiActionProposalStatus>(),
        [AiActionProposalStatus.Failed] = Array.Empty<AiActionProposalStatus>(),
        [AiActionProposalStatus.Expired] = Array.Empty<AiActionProposalStatus>(),
        [AiActionProposalStatus.Cancelled] = Array.Empty<AiActionProposalStatus>(),
    };

    public static bool CanTransition(AiActionProposalStatus from, AiActionProposalStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}

/// <summary>
/// A write action the AI wants to take, awaiting explicit human approval before anything mutates.
/// ActionType identifies the registered IAiTool (Domain.Ai namespace has no dependency on the tool
/// registry itself — that's an Application-layer concern); ParametersJson is exactly what will be
/// passed to that tool's ExecuteAsync if/when approved, frozen at proposal time so an approver is
/// deciding on the same parameters the AI actually explained, not whatever the conversation has
/// drifted to since. TargetEntityType/TargetEntityId are optional context for the single primary
/// entity a proposal affects (e.g. the Lead a follow-up is proposed against), for UI deep-linking —
/// a proposal targeting several entities (e.g. "remind 4 overdue tenants") leaves these null and
/// relies on ParametersJson/ExpectedEffect to describe the full target set.
/// </summary>
public class AiActionProposal : TenantEntity
{
    public Guid? ConversationId { get; set; }
    public Guid RequestedByUserId { get; set; }

    public string ActionType { get; set; } = default!;
    public string? TargetEntityType { get; set; }
    public Guid? TargetEntityId { get; set; }

    public string ParametersJson { get; set; } = default!;
    public string Explanation { get; set; } = default!;
    public string ExpectedEffect { get; set; } = default!;

    /// <summary>"low" | "medium" | "high" — informational for the approval UI; never itself changes
    /// the authorization path (that's always the tool's own RequiredPermission).</summary>
    public string RiskLevel { get; set; } = "low";

    public AiActionProposalStatus Status { get; set; } = AiActionProposalStatus.PendingApproval;

    /// <summary>The generic ApprovalRequest (EntityType="AiActionProposal") created for this proposal —
    /// see AiActionProposalApprovalHandler. Null only in the brief window before that request is created.</summary>
    public Guid? ApprovalRequestId { get; set; }

    public string? ResultJson { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ExecutedAt { get; set; }
}
