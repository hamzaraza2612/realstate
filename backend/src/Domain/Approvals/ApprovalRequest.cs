using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Approvals;

public enum ApprovalStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}

/// <summary>
/// A generic approval request any module can create against any of its own entities (EntityType +
/// EntityId — same polymorphic-reference pattern as Document/Notification, no per-module approval
/// table). Exactly one of ApproverUserId/RequiredPermission is expected to be set: a specific named
/// approver, or "anyone in this tenant holding this permission" — ApprovalService.DecideAsync checks
/// whichever is set. Concurrency: this entity opts into Postgres's xmin-based optimistic concurrency
/// token (configured in ApprovalRequestConfiguration) so two approvers deciding the same pending
/// request at the same instant can't both succeed — the loser gets a concurrency conflict, not a
/// silently-overwritten decision. This is the first use of a real concurrency token in the domain
/// model (see PRODUCT_GAP_AUDIT.md's technical debt register) — deliberately scoped to this new,
/// genuinely concurrent-decision entity rather than retrofitted everywhere at once.
/// </summary>
public class ApprovalRequest : TenantEntity
{
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public Guid? ApproverUserId { get; set; }
    public string? RequiredPermission { get; set; }
    public string? RequestComments { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.Pending;
    public string? DecisionComments { get; set; }
    public Guid? DecidedByUserId { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
}
