using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Subscription;

public enum BillingCycle
{
    Monthly = 0,
    Yearly = 1
}

public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public int UserLimit { get; set; }
    public int ProjectLimit { get; set; }
    public int StorageLimitMb { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<PlanFeature> Features { get; set; } = new List<PlanFeature>();
}

/// <summary>Features bundled into a plan by default; a tenant's actual entitlement can still be overridden per-tenant via TenantFeatureEntitlement.</summary>
public class PlanFeature : BaseEntity
{
    public Guid SubscriptionPlanId { get; set; }
    public SubscriptionPlan? SubscriptionPlan { get; set; }
    public string FeatureCode { get; set; } = default!;
}

/// <summary>Per-tenant override of a feature flag/module entitlement, independent of the plan defaults, so different modules can be sold a-la-carte.</summary>
public class TenantFeatureEntitlement : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public string FeatureCode { get; set; } = default!;
    public bool IsEnabled { get; set; } = true;
}
