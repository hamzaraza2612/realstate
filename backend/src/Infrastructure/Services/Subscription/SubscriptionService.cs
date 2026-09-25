using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Subscription;

/// <summary>
/// Owns the Subscription lifecycle and the one-directional mapping onto Tenant.Status (TenantStatus
/// from Milestone 10 remains the sole API-access gate — every transition here updates it, nothing
/// ever reads Subscription.Status back out of TenantStatus). See docs/SAAS_BILLING.md for the full
/// mapping table and rationale.
/// </summary>
public class SubscriptionService : ISubscriptionService
{
    private static readonly SubscriptionStatus[] NonTerminal =
    {
        SubscriptionStatus.Trialing, SubscriptionStatus.Active, SubscriptionStatus.PastDue, SubscriptionStatus.Paused
    };

    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public SubscriptionService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<Result<SubscriptionDto>> GetForTenantAsync(Guid tenantId, CancellationToken ct = default)
    {
        var sub = await _db.Subscriptions.IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && NonTerminal.Contains(s.Status))
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (sub is null) return Result.Failure<SubscriptionDto>("This tenant has no active subscription.", "not_found");

        return Result.Success(await ToDtoAsync(sub, ct));
    }

    public async Task<IReadOnlyList<SubscriptionDto>> ListAsync(CancellationToken ct = default)
    {
        var subs = await _db.Subscriptions.IgnoreQueryFilters().OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
        var result = new List<SubscriptionDto>();
        foreach (var sub in subs) result.Add(await ToDtoAsync(sub, ct));
        return result;
    }

    public async Task<Result<SubscriptionDto>> CreateAsync(CreateSubscriptionRequest request, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, ct);
        if (tenant is null) return Result.Failure<SubscriptionDto>("Tenant not found.", "tenant_not_found");

        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive, ct);
        if (plan is null) return Result.Failure<SubscriptionDto>("Plan not found or inactive.", "plan_not_found");

        var hasNonTerminal = await _db.Subscriptions.IgnoreQueryFilters()
            .AnyAsync(s => s.TenantId == request.TenantId && NonTerminal.Contains(s.Status), ct);
        if (hasNonTerminal) return Result.Failure<SubscriptionDto>("This tenant already has an active subscription.", "already_subscribed");

        var now = DateTimeOffset.UtcNow;
        var trialDays = request.SkipTrial ? 0 : plan.TrialDays;
        var periodEnd = plan.BillingCycle == BillingCycle.Yearly ? now.AddYears(1) : now.AddMonths(1);

        var subscription = new Domain.Subscription.Subscription
        {
            TenantId = tenant.Id,
            PlanId = plan.Id,
            Status = trialDays > 0 ? SubscriptionStatus.Trialing : SubscriptionStatus.Active,
            TrialStartsAt = trialDays > 0 ? now : null,
            TrialEndsAt = trialDays > 0 ? now.AddDays(trialDays) : null,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = periodEnd,
            Currency = plan.Currency,
            PriceSnapshot = plan.Price,
            BillingCycle = plan.BillingCycle
        };
        _db.Subscriptions.Add(subscription);

        tenant.Status = trialDays > 0 ? TenantStatus.Trial : TenantStatus.Active;
        tenant.SubscriptionPlanId = plan.Id;
        tenant.TrialEndsAt = subscription.TrialEndsAt;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Subscription", "Subscription", subscription.Id.ToString(),
            after: new { tenant.Name, PlanCode = plan.Code, subscription.Status }, tenantIdOverride: tenant.Id, ct: ct);

        return Result.Success(await ToDtoAsync(subscription, ct));
    }

    public async Task<Result<SubscriptionDto>> TransitionAsync(Guid subscriptionId, TransitionSubscriptionRequest request, CancellationToken ct = default)
    {
        var subscription = await _db.Subscriptions.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == subscriptionId, ct);
        if (subscription is null) return Result.Failure<SubscriptionDto>("Subscription not found.", "not_found");

        if (!SubscriptionStatusRules.CanTransition(subscription.Status, request.ToStatus))
        {
            return Result.Failure<SubscriptionDto>(
                $"Cannot transition a subscription from {subscription.Status} to {request.ToStatus}.", "invalid_transition");
        }

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstAsync(t => t.Id == subscription.TenantId, ct);
        var beforeStatus = subscription.Status;
        var beforeTenantStatus = tenant.Status;

        subscription.Status = request.ToStatus;
        if (request.ToStatus == SubscriptionStatus.Cancelled)
        {
            subscription.CancelledAt = DateTimeOffset.UtcNow;
        }
        tenant.Status = MapToTenantStatus(request.ToStatus);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<SubscriptionDto>("This subscription was updated by someone else. Please retry.", "concurrency_conflict");
        }

        await _auditLogger.LogAsync("Transition", "Subscription", "Subscription", subscription.Id.ToString(),
            before: new { SubscriptionStatus = beforeStatus, TenantStatus = beforeTenantStatus },
            after: new { SubscriptionStatus = subscription.Status, TenantStatus = tenant.Status, request.Reason },
            tenantIdOverride: tenant.Id, ct: ct);

        return Result.Success(await ToDtoAsync(subscription, ct));
    }

    /// <summary>The single documented mapping from Subscription.Status onto Tenant.Status — see
    /// docs/SAAS_BILLING.md. PastDue is a grace period (still usable); Paused/Expired suspend access
    /// without deleting anything; Cancelled matches the pre-existing TenantStatus.Cancelled.</summary>
    public static TenantStatus MapToTenantStatus(SubscriptionStatus status) => status switch
    {
        SubscriptionStatus.Trialing => TenantStatus.Trial,
        SubscriptionStatus.Active => TenantStatus.Active,
        SubscriptionStatus.PastDue => TenantStatus.Active,
        SubscriptionStatus.Paused => TenantStatus.Suspended,
        SubscriptionStatus.Cancelled => TenantStatus.Cancelled,
        SubscriptionStatus.Expired => TenantStatus.Suspended,
        _ => TenantStatus.Suspended
    };

    private async Task<SubscriptionDto> ToDtoAsync(Domain.Subscription.Subscription sub, CancellationToken ct)
    {
        var tenantName = await _db.Tenants.IgnoreQueryFilters().Where(t => t.Id == sub.TenantId).Select(t => t.Name).FirstOrDefaultAsync(ct) ?? "";
        var plan = await _db.SubscriptionPlans.Where(p => p.Id == sub.PlanId).Select(p => new { p.Name, p.Code }).FirstOrDefaultAsync(ct);

        return new SubscriptionDto(
            sub.Id, sub.TenantId, tenantName, sub.PlanId, plan?.Name ?? "", plan?.Code ?? "",
            sub.Status, sub.TrialStartsAt, sub.TrialEndsAt, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
            sub.CancelAtPeriodEnd, sub.CancelledAt, sub.Currency, sub.PriceSnapshot, sub.BillingCycle, sub.CreatedAt);
    }
}
