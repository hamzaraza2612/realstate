using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Subscription;

public enum BillingCycle
{
    Monthly = 0,
    Yearly = 1
}

/// <summary>
/// A plan sold to tenants — pure data, never referenced by name/tier in application logic (no
/// `if (plan.Code == "premium")` anywhere). What a plan actually grants is expressed entirely via
/// its <see cref="PlanEntitlement"/> rows, resolved through ITenantEntitlementService — see
/// docs/SAAS_BILLING.md. Price/Currency/BillingCycle/TrialDays are plan-level configuration only;
/// a Subscription snapshots Price/Currency/BillingCycle at subscribe time so a later plan price
/// change never silently changes what an existing subscriber is being charged.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Code { get; set; } = default!;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Default trial length in days for a tenant newly subscribed to this plan; 0 means no trial.</summary>
    public int TrialDays { get; set; } = 14;

    /// <summary>ISO 4217 currency code (e.g. "USD", "AED", "SAR") — never assumed to be USD elsewhere.</summary>
    public string Currency { get; set; } = "USD";

    public decimal Price { get; set; }
    public decimal? SetupPrice { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;

    /// <summary>Free-form JSON for provider-specific or presentational data (e.g. marketing bullet
    /// points) — never parsed by billing/entitlement logic itself.</summary>
    public string? MetadataJson { get; set; }

    public ICollection<PlanEntitlement> Entitlements { get; set; } = new List<PlanEntitlement>();
}
