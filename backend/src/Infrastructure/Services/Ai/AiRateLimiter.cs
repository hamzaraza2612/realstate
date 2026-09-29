using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Ai;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Ai;

public class AiRateLimiter : IAiRateLimiter
{
    private readonly AppDbContext _db;
    private readonly AiSettings _settings;

    public AiRateLimiter(AppDbContext db, IOptions<AiSettings> settings)
    {
        _db = db;
        _settings = settings.Value;
    }

    public async Task<bool> TryAcquireAsync(Guid tenantId, CancellationToken ct = default)
    {
        var windowStart = DateTimeOffset.UtcNow.AddMinutes(-1);
        var recentCount = await _db.AiUsageRecords.IgnoreQueryFilters()
            .CountAsync(r => r.TenantId == tenantId && r.OccurredAt >= windowStart, ct);
        return recentCount < _settings.RequestsPerMinutePerTenant;
    }
}
