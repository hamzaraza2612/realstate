using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Subscription;

/// <summary>
/// The smallest coherent SaaS lifecycle: a tenant starts Trialing, becomes Active on payment,
/// may fall PastDue on a failed/missed payment, can be Paused by a platform admin, and eventually
/// reaches the terminal Cancelled or Expired state. See SubscriptionStatusRules for valid
/// transitions and docs/SAAS_BILLING.md for how this status drives Tenant.Status (TenantStatus from
/// Milestone 10 remains the sole API-access gate — this is a richer, separate lifecycle that feeds
/// into it one-directionally, never the reverse).
/// </summary>
public enum SubscriptionStatus
{
    Trialing = 0,
    Active = 1,
    PastDue = 2,
    Paused = 3,
    Cancelled = 4,
    Expired = 5
}

public static class SubscriptionStatusRules
{
    private static readonly Dictionary<SubscriptionStatus, SubscriptionStatus[]> Allowed = new()
    {
        [SubscriptionStatus.Trialing] = new[] { SubscriptionStatus.Active, SubscriptionStatus.Expired, SubscriptionStatus.Cancelled },
        [SubscriptionStatus.Active] = new[] { SubscriptionStatus.PastDue, SubscriptionStatus.Paused, SubscriptionStatus.Cancelled },
        [SubscriptionStatus.PastDue] = new[] { SubscriptionStatus.Active, SubscriptionStatus.Cancelled, SubscriptionStatus.Expired },
        [SubscriptionStatus.Paused] = new[] { SubscriptionStatus.Active, SubscriptionStatus.Cancelled },
        [SubscriptionStatus.Cancelled] = new[] { SubscriptionStatus.Expired },
        [SubscriptionStatus.Expired] = Array.Empty<SubscriptionStatus>(),
    };

    public static bool CanTransition(SubscriptionStatus from, SubscriptionStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);

    /// <summary>Statuses where the tenant should currently be able to use the product (mirrors
    /// TenantStatus.IsUsable's Trial/Active split one level down).</summary>
    public static bool IsCurrentlyUsable(this SubscriptionStatus status) =>
        status is SubscriptionStatus.Trialing or SubscriptionStatus.Active or SubscriptionStatus.PastDue;
}

/// <summary>One tenant's subscription to a plan. A tenant has at most one non-terminal (Trialing/
/// Active/PastDue/Paused) subscription at a time (enforced by a filtered unique index — see
/// SubscriptionConfiguration); a Cancelled/Expired row stays as history, and a fresh Subscription
/// row is created if the tenant resubscribes later. Price/Currency/BillingCycle are a snapshot taken
/// at subscribe/renew time, deliberately independent of the plan's own current values.</summary>
public class Subscription : TenantEntity
{
    public Guid PlanId { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trialing;

    public DateTimeOffset? TrialStartsAt { get; set; }
    public DateTimeOffset? TrialEndsAt { get; set; }

    public DateTimeOffset CurrentPeriodStart { get; set; }
    public DateTimeOffset CurrentPeriodEnd { get; set; }

    public bool CancelAtPeriodEnd { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }

    public string Currency { get; set; } = "USD";
    public decimal PriceSnapshot { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;

    /// <summary>Nullable extension fields for a future real payment provider (Stripe/regional
    /// gateway) to correlate its own customer/subscription objects — unused, never populated, by
    /// anything in this milestone.</summary>
    public string? ExternalProvider { get; set; }
    public string? ExternalCustomerId { get; set; }
    public string? ExternalSubscriptionId { get; set; }
}
