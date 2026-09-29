namespace RealEstateErp.Application.Ai;

/// <summary>
/// Tenant-aware AI usage protection — deliberately separate from the IP-based AspNetCoreRateLimit
/// middleware already in place (Milestone 1), which has no concept of tenant/plan and would let one
/// tenant's heavy AI usage starve another's from behind a shared NAT/proxy. Backed by AiUsageRecord
/// rows (a COUNT query over a sliding window), not in-memory counters, so the limit holds correctly
/// across multiple API instances without needing a distributed cache. See docs/AI_ARCHITECTURE.md.
/// </summary>
public interface IAiRateLimiter
{
    /// <summary>True if the tenant is currently under its configured requests-per-minute budget.
    /// Does not itself record a usage row — call this before invoking the provider, then record the
    /// actual usage (with real token counts) after the call completes.</summary>
    Task<bool> TryAcquireAsync(Guid tenantId, CancellationToken ct = default);
}
