namespace RealEstateErp.Application.Common.Interfaces;

/// <summary>
/// The one place code asks "what is today, for this tenant" — see Shared.Common.TenantClock for the
/// pure conversion logic this wraps with a Tenant.Timezone lookup. Two flavors: the ambient-tenant
/// methods (ordinary tenant-scoped requests) and the explicit-tenant overloads (platform-admin
/// operations acting on a tenant that isn't the ambient one, e.g. generating an invoice for a
/// specific subscription's tenant). Every timestamp is still stored in UTC; this only answers
/// calendar-day questions. See docs/LOCALIZATION.md.
/// </summary>
public interface ITenantTimeService
{
    DateTimeOffset UtcNow { get; }

    /// <summary>The ambient tenant's IANA timezone id, or "UTC" if there is no ambient tenant.</summary>
    Task<string> GetTimezoneAsync(CancellationToken ct = default);

    /// <summary>Today's calendar date in the ambient tenant's timezone.</summary>
    Task<DateOnly> TodayAsync(CancellationToken ct = default);

    Task<string> GetTimezoneForTenantAsync(Guid tenantId, CancellationToken ct = default);

    Task<DateOnly> TodayForTenantAsync(Guid tenantId, CancellationToken ct = default);
}
