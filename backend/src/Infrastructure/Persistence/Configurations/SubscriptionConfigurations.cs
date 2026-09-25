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
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.Price).HasColumnType("numeric(18,2)");
        b.Property(x => x.SetupPrice).HasColumnType("numeric(18,2)");
        b.HasIndex(x => x.Code).IsUnique();
        b.HasIndex(x => new { x.IsActive, x.DisplayOrder });
        b.HasMany(x => x.Entitlements).WithOne(x => x.SubscriptionPlan!).HasForeignKey(x => x.SubscriptionPlanId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PlanEntitlementConfiguration : IEntityTypeConfiguration<PlanEntitlement>
{
    public void Configure(EntityTypeBuilder<PlanEntitlement> b)
    {
        b.ToTable("plan_entitlements");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.SubscriptionPlanId, x.Code }).IsUnique();
    }
}

public class TenantEntitlementOverrideConfiguration : IEntityTypeConfiguration<TenantEntitlementOverride>
{
    public void Configure(EntityTypeBuilder<TenantEntitlementOverride> b)
    {
        b.ToTable("tenant_entitlement_overrides");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
    }
}

public class SubscriptionConfiguration : IEntityTypeConfiguration<RealEstateErp.Domain.Subscription.Subscription>
{
    public void Configure(EntityTypeBuilder<RealEstateErp.Domain.Subscription.Subscription> b)
    {
        b.ToTable("subscriptions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.PriceSnapshot).HasColumnType("numeric(18,2)");
        b.Property(x => x.ExternalProvider).HasMaxLength(50);
        b.Property(x => x.ExternalCustomerId).HasMaxLength(200);
        b.Property(x => x.ExternalSubscriptionId).HasMaxLength(200);
        b.HasIndex(x => x.TenantId);
        b.HasIndex(x => x.PlanId);
        b.HasIndex(x => x.Status);
        // At most one non-terminal subscription per tenant at a time (Trialing=0/Active=1/PastDue=2/Paused=3);
        // Cancelled=4/Expired=5 rows stay as history and are excluded from the filter.
        b.HasIndex(x => x.TenantId).IsUnique().HasFilter("\"Status\" IN (0,1,2,3)").HasDatabaseName("IX_subscriptions_TenantId_NonTerminal_Unique");
        // Postgres's own xmin system column as an optimistic-concurrency token — no extra column
        // needed. Non-obsolete equivalent of UseXminAsConcurrencyToken() (already used, with a
        // pending-obsolete warning, by ApprovalRequest elsewhere in this codebase).
        b.Property<uint>("xmin").IsRowVersion();
    }
}
