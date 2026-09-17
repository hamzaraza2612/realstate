using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Administration;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<PlanFeature> PlanFeatures => Set<PlanFeature>();
    public DbSet<TenantFeatureEntitlement> TenantFeatureEntitlements => Set<TenantFeatureEntitlement>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        ApplyTenantQueryFilters(builder);
    }

    private void ApplyTenantQueryFilters(ModelBuilder builder)
    {
        var method = typeof(AppDbContext).GetMethod(nameof(SetTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(ITenantOwned).IsAssignableFrom(entityType.ClrType))
            {
                method.MakeGenericMethod(entityType.ClrType).Invoke(this, new object[] { builder });
            }
        }

        // AppUser has a nullable TenantId (null = platform/Super Admin account) so it can't implement ITenantOwned.
        builder.Entity<AppUser>().HasQueryFilter(u =>
            _tenantContext.BypassTenantFilter || u.TenantId == _tenantContext.TenantId);
        builder.Entity<AppRole>().HasQueryFilter(r =>
            _tenantContext.BypassTenantFilter || r.TenantId == null || r.TenantId == _tenantContext.TenantId);
    }

    private void SetTenantFilter<TEntity>(ModelBuilder builder) where TEntity : class, ITenantOwned
    {
        builder.Entity<TEntity>().HasQueryFilter(e =>
            _tenantContext.BypassTenantFilter || e.TenantId == (_tenantContext.TenantId ?? Guid.Empty));
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var userId = _tenantContext.UserId;
        var auditEntries = new List<AuditLog>();

        foreach (var entry in ChangeTracker.Entries().ToList())
        {
            if (entry.Entity is AuditLog) continue;

            if (entry.Entity is ITenantOwned tenantOwned && entry.State == EntityState.Added && tenantOwned.TenantId == Guid.Empty)
            {
                tenantOwned.TenantId = _tenantContext.TenantId ?? Guid.Empty;
            }

            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = now;
                    baseEntity.CreatedBy = userId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                    baseEntity.UpdatedBy = userId;
                }
            }

            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted &&
                entry.Entity is not RefreshToken &&
                entry.Entity.GetType().Namespace?.StartsWith("Microsoft.AspNetCore.Identity") != true)
            {
                var entityType = entry.Entity.GetType().Name;
                var idProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
                var entityId = idProp?.CurrentValue?.ToString();

                auditEntries.Add(new AuditLog
                {
                    TenantId = _tenantContext.TenantId,
                    UserId = userId,
                    UserEmail = _tenantContext.UserEmail,
                    Action = entry.State.ToString(),
                    Module = "System",
                    EntityType = entityType,
                    EntityId = entityId,
                    BeforeJson = entry.State != EntityState.Added ? SerializeSafely(entry.OriginalValues) : null,
                    AfterJson = entry.State != EntityState.Deleted ? SerializeSafely(entry.CurrentValues) : null,
                    CreatedAt = now
                });
            }
        }

        var result = await base.SaveChangesAsync(cancellationToken);

        if (auditEntries.Count > 0)
        {
            AuditLogs.AddRange(auditEntries);
            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    private static string? SerializeSafely(Microsoft.EntityFrameworkCore.ChangeTracking.PropertyValues values)
    {
        try
        {
            var dict = values.Properties.ToDictionary(p => p.Name, p => values[p]);
            return JsonSerializer.Serialize(dict);
        }
        catch
        {
            return null;
        }
    }
}
