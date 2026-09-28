using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Domain.Property;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Subscription;

/// <summary>Answers "what is this tenant using" with COUNT/SUM aggregates only — no full-table loads
/// of business data. Combines those counts with ITenantEntitlementService's resolved limits to
/// produce the display-oriented Metrics list (Normal/Approaching/AtLimit — Approaching is a display
/// hint at >=80% of a finite limit, not itself an enforcement boundary).</summary>
public class TenantUsageService : ITenantUsageService
{
    private readonly AppDbContext _db;
    private readonly ITenantEntitlementService _entitlements;

    public TenantUsageService(AppDbContext db, ITenantEntitlementService entitlements)
    {
        _db = db;
        _entitlements = entitlements;
    }

    public async Task<TenantUsageDto> GetUsageAsync(Guid tenantId, CancellationToken ct = default)
    {
        var users = await _db.Users.CountAsync(u => u.TenantId == tenantId, ct);
        var properties = await _db.Properties.IgnoreQueryFilters().CountAsync(p => p.TenantId == tenantId, ct);
        var projects = await _db.Projects.IgnoreQueryFilters().CountAsync(p => p.TenantId == tenantId, ct);
        var portalUsers = await _db.PortalUsers.IgnoreQueryFilters().CountAsync(u => u.TenantId == tenantId && u.IsActive, ct);
        var activeLeases = await _db.Leases.IgnoreQueryFilters().CountAsync(l => l.TenantId == tenantId && l.Status == LeaseStatus.Active, ct);
        var storageBytes = await _db.DocumentVersions.IgnoreQueryFilters().Where(v => v.TenantId == tenantId).SumAsync(v => (long?)v.SizeBytes, ct) ?? 0;
        var storageMb = storageBytes / (1024 * 1024);

        var metrics = new List<UsageMetricDto>
        {
            await BuildMetricAsync(tenantId, EntitlementCodes.MaxUsers, "Users", users, ct),
            await BuildMetricAsync(tenantId, EntitlementCodes.MaxProperties, "Properties", properties, ct),
            await BuildMetricAsync(tenantId, EntitlementCodes.MaxProjects, "Projects", projects, ct),
            await BuildMetricAsync(tenantId, EntitlementCodes.MaxPortalUsers, "Portal Users", portalUsers, ct),
            await BuildMetricAsync(tenantId, EntitlementCodes.MaxStorageMb, "Storage (MB)", storageMb, ct),
        };

        return new TenantUsageDto(users, properties, projects, portalUsers, activeLeases, storageBytes, metrics);
    }

    private async Task<UsageMetricDto> BuildMetricAsync(Guid tenantId, string code, string label, long current, CancellationToken ct)
    {
        var limit = await _entitlements.GetLimitAsync(tenantId, code, ct);
        var state = limit switch
        {
            null => UsageState.Normal,
            var l when current >= l => UsageState.AtLimit,
            var l when current >= l * 0.8m => UsageState.Approaching,
            _ => UsageState.Normal
        };
        return new UsageMetricDto(code, label, current, limit, state);
    }
}
