using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services;

public class TenantTimeService : ITenantTimeService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public TenantTimeService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    public async Task<string> GetTimezoneAsync(CancellationToken ct = default) =>
        _tenantContext.TenantId is { } tenantId ? await GetTimezoneForTenantAsync(tenantId, ct) : "UTC";

    public async Task<DateOnly> TodayAsync(CancellationToken ct = default) =>
        TenantClock.TodayInTimeZone(UtcNow, await GetTimezoneAsync(ct));

    public async Task<string> GetTimezoneForTenantAsync(Guid tenantId, CancellationToken ct = default) =>
        await _db.Tenants.IgnoreQueryFilters().Where(t => t.Id == tenantId).Select(t => t.Timezone).FirstOrDefaultAsync(ct) ?? "UTC";

    public async Task<DateOnly> TodayForTenantAsync(Guid tenantId, CancellationToken ct = default) =>
        TenantClock.TodayInTimeZone(UtcNow, await GetTimezoneForTenantAsync(tenantId, ct));
}
