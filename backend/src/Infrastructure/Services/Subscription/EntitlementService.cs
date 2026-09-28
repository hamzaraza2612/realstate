using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Subscription;

public class EntitlementService : ITenantEntitlementService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public EntitlementService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<bool> HasUnrestrictedAccessAsync(Guid tenantId, CancellationToken ct = default) =>
        !(await GetActivePlanIdAsync(tenantId, ct)).HasValue;

    private async Task<Guid?> GetActivePlanIdAsync(Guid tenantId, CancellationToken ct) =>
        await _db.Subscriptions.IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && (s.Status == SubscriptionStatus.Trialing || s.Status == SubscriptionStatus.Active
                || s.Status == SubscriptionStatus.PastDue || s.Status == SubscriptionStatus.Paused))
            .Select(s => (Guid?)s.PlanId)
            .FirstOrDefaultAsync(ct);

    private async Task<(bool? BoolValue, long? NumericValue, bool Found)> ResolveAsync(Guid tenantId, string code, CancellationToken ct)
    {
        var over = await _db.TenantEntitlementOverrides.IgnoreQueryFilters()
            .Where(o => o.TenantId == tenantId && o.Code == code)
            .Select(o => new { o.BoolValue, o.NumericValue })
            .FirstOrDefaultAsync(ct);
        if (over is not null) return (over.BoolValue, over.NumericValue, true);

        var planId = await GetActivePlanIdAsync(tenantId, ct);
        if (planId is null) return (null, null, false);

        var plan = await _db.PlanEntitlements
            .Where(p => p.SubscriptionPlanId == planId && p.Code == code)
            .Select(p => new { p.BoolValue, p.NumericValue })
            .FirstOrDefaultAsync(ct);
        if (plan is null) return (null, null, false);

        return (plan.BoolValue, plan.NumericValue, true);
    }

    public async Task<bool> IsFeatureEnabledAsync(Guid tenantId, string featureCode, CancellationToken ct = default)
    {
        var (boolValue, _, found) = await ResolveAsync(tenantId, featureCode, ct);
        return !found || boolValue != false;
    }

    public async Task<long?> GetLimitAsync(Guid tenantId, string limitCode, CancellationToken ct = default)
    {
        var (_, numericValue, found) = await ResolveAsync(tenantId, limitCode, ct);
        return found ? numericValue : null;
    }

    public async Task<IReadOnlyList<TenantEntitlementDto>> GetEffectiveEntitlementsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var results = new List<TenantEntitlementDto>();
        foreach (var (code, type) in EntitlementCodes.All)
        {
            var (boolValue, numericValue, found) = await ResolveAsync(tenantId, code, ct);
            results.Add(type == EntitlementType.Feature
                ? new TenantEntitlementDto(code, type, !found || boolValue != false, null)
                : new TenantEntitlementDto(code, type, true, found ? numericValue : null));
        }
        return results;
    }

    public async Task<IReadOnlyList<TenantEntitlementOverrideDto>> ListOverridesAsync(Guid tenantId, CancellationToken ct = default) =>
        await _db.TenantEntitlementOverrides.IgnoreQueryFilters().Where(o => o.TenantId == tenantId)
            .Select(o => new TenantEntitlementOverrideDto(o.Id, o.TenantId, o.Code, o.BoolValue, o.NumericValue))
            .ToListAsync(ct);

    public async Task SetOverrideAsync(Guid tenantId, SetTenantEntitlementOverrideRequest request, CancellationToken ct = default)
    {
        var existing = await _db.TenantEntitlementOverrides.IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Code == request.Code, ct);

        if (existing is null)
        {
            _db.TenantEntitlementOverrides.Add(new TenantEntitlementOverride
            {
                TenantId = tenantId,
                Code = request.Code,
                BoolValue = request.BoolValue,
                NumericValue = request.NumericValue
            });
        }
        else
        {
            existing.BoolValue = request.BoolValue;
            existing.NumericValue = request.NumericValue;
        }

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("SetOverride", "Subscription", "TenantEntitlementOverride", request.Code,
            after: new { request.Code, request.BoolValue, request.NumericValue }, tenantIdOverride: tenantId, ct: ct);
    }

    public async Task RemoveOverrideAsync(Guid tenantId, string code, CancellationToken ct = default)
    {
        var existing = await _db.TenantEntitlementOverrides.IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Code == code, ct);
        if (existing is not null)
        {
            _db.TenantEntitlementOverrides.Remove(existing);
            await _db.SaveChangesAsync(ct);

            await _auditLogger.LogAsync("RemoveOverride", "Subscription", "TenantEntitlementOverride", code,
                before: new { code }, tenantIdOverride: tenantId, ct: ct);
        }
    }
}
