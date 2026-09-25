using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services.Subscription;

namespace RealEstateErp.Infrastructure.Jobs;

/// <summary>
/// The one Hangfire recurring job this milestone introduces — Hangfire/Redis existed since Milestone
/// 9 with zero consumers (see PRODUCT_GAP_AUDIT.md); this is the first real one. Runs hourly (see
/// Program.cs registration). Idempotent and safe to run concurrently/duplicated: each transition is
/// guarded by SubscriptionStatusRules.CanTransition, so re-running against an already-Expired
/// subscription is a no-op, and a genuine double-execution race is caught by the Subscription row's
/// own xmin concurrency token (a losing SaveChanges throws DbUpdateConcurrencyException, which this
/// job logs and skips rather than crashing the whole run).
///
/// Scope for this milestone is deliberately narrow — trial expiration only (the example the task
/// spec names first and the one with an unambiguous, deterministic trigger: TrialEndsAt has passed).
/// This class is the natural home for further reconciliation (e.g. a PastDue grace-period timeout)
/// once that policy is actually decided; adding it is a new private method here, not new
/// infrastructure — see docs/SAAS_BILLING.md.
/// </summary>
public class SubscriptionLifecycleJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionLifecycleJob> _logger;

    public SubscriptionLifecycleJob(IServiceScopeFactory scopeFactory, ILogger<SubscriptionLifecycleJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditLogger = scope.ServiceProvider.GetRequiredService<IAuditLogger>();

        var now = DateTimeOffset.UtcNow;
        var expiredTrials = await db.Subscriptions.IgnoreQueryFilters()
            .Where(s => s.Status == SubscriptionStatus.Trialing && s.TrialEndsAt != null && s.TrialEndsAt <= now)
            .ToListAsync(ct);

        var transitioned = 0;
        foreach (var subscription in expiredTrials)
        {
            if (!SubscriptionStatusRules.CanTransition(subscription.Status, SubscriptionStatus.Expired)) continue;

            var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == subscription.TenantId, ct);
            if (tenant is null) continue;

            var beforeTenantStatus = tenant.Status;
            subscription.Status = SubscriptionStatus.Expired;
            tenant.Status = SubscriptionService.MapToTenantStatus(SubscriptionStatus.Expired);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another instance of this job (or an admin action) already moved this subscription —
                // safe to skip; the next run will simply find it no longer Trialing.
                _logger.LogInformation("Skipped subscription {SubscriptionId}: concurrently modified.", subscription.Id);
                continue;
            }

            await auditLogger.LogAsync("TrialExpired", "Subscription", "Subscription", subscription.Id.ToString(),
                before: new { TenantStatus = beforeTenantStatus },
                after: new { SubscriptionStatus = subscription.Status, TenantStatus = tenant.Status },
                tenantIdOverride: tenant.Id, actorEmailOverride: "system:hangfire", ct: ct);

            transitioned++;
        }

        if (transitioned > 0)
        {
            _logger.LogInformation("SubscriptionLifecycleJob expired {Count} trial subscription(s).", transitioned);
        }
    }
}
