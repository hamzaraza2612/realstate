namespace RealEstateErp.Application.Subscription;

public enum UsageState
{
    Normal = 0,
    Approaching = 1,
    AtLimit = 2
}

/// <summary>One metered dimension's current count against its resolved limit. Limit null means
/// unlimited, in which case State is always Normal. Approaching is reported at >=80% of a finite
/// limit — a display hint only; enforcement itself happens at the limit boundary (see
/// ITenantEntitlementService.GetLimitAsync and the five call sites that check it), not here.</summary>
public record UsageMetricDto(string Code, string Label, long Current, long? Limit, UsageState State);

public record TenantUsageDto(
    int Users, int Properties, int Projects, int PortalUsers, int ActiveLeases, long StorageBytes,
    IReadOnlyList<UsageMetricDto> Metrics);

/// <summary>Answers "what is this tenant using / allowed to use / how close to its limit" with
/// efficient COUNT/SUM aggregate queries — never a full-table scan of business data. Combines raw
/// counts with ITenantEntitlementService's resolved limits to produce the Metrics list.</summary>
public interface ITenantUsageService
{
    Task<TenantUsageDto> GetUsageAsync(Guid tenantId, CancellationToken ct = default);
}
