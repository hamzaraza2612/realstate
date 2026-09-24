using FluentValidation;
using RealEstateErp.Domain.Approvals;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Approvals;

public record ApprovalRequestDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    Guid RequestedByUserId,
    string? RequestedByUserName,
    Guid? ApproverUserId,
    string? ApproverUserName,
    string? RequiredPermission,
    string? RequestComments,
    ApprovalStatus Status,
    string? DecisionComments,
    Guid? DecidedByUserId,
    string? DecidedByUserName,
    DateTimeOffset? DecidedAt,
    DateTimeOffset CreatedAt);

public record CreateApprovalRequestRequest(string EntityType, Guid EntityId, Guid? ApproverUserId, string? RequiredPermission, string? RequestComments);

public record DecideApprovalRequestRequest(bool Approve, string? DecisionComments);

public record ApprovalRequestFilter(ApprovalStatus? Status);

/// <summary>
/// Lets a module wire its own existing approve/reject action to the generic Approval Inbox's Decide
/// button, without ApprovalService (a foundation module) ever referencing Construction/Procurement/
/// Sales directly — each module registers its own implementation in DI, keyed by the EntityType string
/// it already uses when calling CreateRequestAsync, and ApprovalService looks it up by that key. Not
/// registering a handler for an EntityType is fine — DecideAsync still resolves the ApprovalRequest
/// itself; only the "also drive the real module action" behavior is skipped.
/// </summary>
public interface IApprovalLinkedEntityHandler
{
    string EntityType { get; }
    Task ApplyDecisionAsync(Guid entityId, bool approved, CancellationToken ct);
}

public interface IApprovalService
{
    /// <summary>My inbox — pending requests where I'm the named approver, or I hold the required
    /// permission. Object-scoped to the caller, so no additional permission gate is needed on top.</summary>
    Task<PagedResult<ApprovalRequestDto>> ListMyInboxAsync(PagedRequest request, ApprovalRequestFilter filter, CancellationToken ct = default);

    /// <summary>Full approval history for a specific business entity — gated by Permissions.Approvals.View.</summary>
    Task<Result<IReadOnlyList<ApprovalRequestDto>>> ListForEntityAsync(string entityType, Guid entityId, CancellationToken ct = default);

    Task<Result<ApprovalRequestDto>> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Public entry point (also used internally): validates exactly one of
    /// approverUserId/requiredPermission is set.</summary>
    Task<Result<ApprovalRequestDto>> CreateRequestAsync(CreateApprovalRequestRequest request, CancellationToken ct = default);

    /// <summary>The Approval Inbox's decide action — re-checks that the caller is authorized (named
    /// approver, or holds RequiredPermission) before applying the decision. Protected against
    /// duplicate/concurrent decisions by an xmin optimistic-concurrency check.</summary>
    Task<Result<ApprovalRequestDto>> DecideAsync(Guid id, DecideApprovalRequestRequest request, CancellationToken ct = default);

    /// <summary>Called by a module's own (already-permission-checked) approve/reject endpoint to
    /// resolve the ApprovalRequest it created at submission time, without re-running the
    /// approver/permission check a second time — the caller's own endpoint already authorized this.
    /// A no-op (returns null) if no pending request exists for this entity, so callers can invoke it
    /// unconditionally without first checking whether one was ever created.</summary>
    Task<ApprovalRequestDto?> ResolveForEntityAsync(string entityType, Guid entityId, bool approved, Guid decidedByUserId, string? decisionComments, CancellationToken ct = default);
}

public class CreateApprovalRequestRequestValidator : AbstractValidator<CreateApprovalRequestRequest>
{
    public CreateApprovalRequestRequestValidator()
    {
        RuleFor(x => x.EntityType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.EntityId).NotEmpty();
        RuleFor(x => x).Must(x => x.ApproverUserId.HasValue || !string.IsNullOrWhiteSpace(x.RequiredPermission))
            .WithMessage("Either an approver user or a required permission must be specified.");
        RuleFor(x => x.RequestComments).MaximumLength(2000);
    }
}

public class DecideApprovalRequestRequestValidator : AbstractValidator<DecideApprovalRequestRequest>
{
    public DecideApprovalRequestRequestValidator()
    {
        RuleFor(x => x.DecisionComments).MaximumLength(2000);
    }
}
