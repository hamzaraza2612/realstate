using FluentValidation;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Subscription;

public record SubscriptionDto(
    Guid Id, Guid TenantId, string TenantName, Guid PlanId, string PlanName, string PlanCode,
    SubscriptionStatus Status, DateTimeOffset? TrialStartsAt, DateTimeOffset? TrialEndsAt,
    DateTimeOffset CurrentPeriodStart, DateTimeOffset CurrentPeriodEnd, bool CancelAtPeriodEnd,
    DateTimeOffset? CancelledAt, string Currency, decimal PriceSnapshot, BillingCycle BillingCycle,
    DateTimeOffset CreatedAt);

/// <summary>Assigns a plan to a tenant, creating a new Subscription in Trialing (if the plan has
/// TrialDays > 0) or Active (immediately, e.g. a platform admin manually onboarding a paying
/// customer). Fails if the tenant already has a non-terminal subscription.</summary>
public record CreateSubscriptionRequest(Guid TenantId, Guid PlanId, bool SkipTrial);

public record TransitionSubscriptionRequest(SubscriptionStatus ToStatus, string? Reason);

public interface ISubscriptionService
{
    Task<Result<SubscriptionDto>> GetForTenantAsync(Guid tenantId, CancellationToken ct = default);
    Task<IReadOnlyList<SubscriptionDto>> ListAsync(CancellationToken ct = default);
    Task<Result<SubscriptionDto>> CreateAsync(CreateSubscriptionRequest request, CancellationToken ct = default);

    /// <summary>Validates the transition against SubscriptionStatusRules, applies it, updates the
    /// owning Tenant.Status per the documented mapping (see docs/SAAS_BILLING.md), and audits the
    /// change. Guarded by the Subscription row's own xmin concurrency token.</summary>
    Task<Result<SubscriptionDto>> TransitionAsync(Guid subscriptionId, TransitionSubscriptionRequest request, CancellationToken ct = default);
}

public class CreateSubscriptionRequestValidator : AbstractValidator<CreateSubscriptionRequest>
{
    public CreateSubscriptionRequestValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.PlanId).NotEmpty();
    }
}

public class TransitionSubscriptionRequestValidator : AbstractValidator<TransitionSubscriptionRequest>
{
    public TransitionSubscriptionRequestValidator()
    {
        RuleFor(x => x.ToStatus).IsInEnum();
    }
}
