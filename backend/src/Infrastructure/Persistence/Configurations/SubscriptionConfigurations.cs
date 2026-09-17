using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> b)
    {
        b.ToTable("subscription_plans");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Price).HasColumnType("numeric(18,2)");
        b.HasMany(x => x.Features).WithOne(x => x.SubscriptionPlan!).HasForeignKey(x => x.SubscriptionPlanId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PlanFeatureConfiguration : IEntityTypeConfiguration<PlanFeature>
{
    public void Configure(EntityTypeBuilder<PlanFeature> b)
    {
        b.ToTable("plan_features");
        b.HasKey(x => x.Id);
        b.Property(x => x.FeatureCode).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.SubscriptionPlanId, x.FeatureCode }).IsUnique();
    }
}

public class TenantFeatureEntitlementConfiguration : IEntityTypeConfiguration<TenantFeatureEntitlement>
{
    public void Configure(EntityTypeBuilder<TenantFeatureEntitlement> b)
    {
        b.ToTable("tenant_feature_entitlements");
        b.HasKey(x => x.Id);
        b.Property(x => x.FeatureCode).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.TenantId, x.FeatureCode }).IsUnique();
    }
}
