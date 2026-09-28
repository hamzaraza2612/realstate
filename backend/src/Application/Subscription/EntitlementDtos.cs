using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.Application.Subscription;

/// <summary>The effective, fully-resolved entitlement set for the current tenant — plan defaults with
/// any per-tenant override applied. See ITenantEntitlementService for the resolution order.</summary>
public record TenantEntitlementDto(string Code, EntitlementType Type, bool Enabled, long? Limit);

public record TenantEntitlementOverrideDto(Guid Id, Guid TenantId, string Code, bool? BoolValue, long? NumericValue);
public record SetTenantEntitlementOverrideRequest(string Code, bool? BoolValue, long? NumericValue);

/// <summary>
/// Resolves what a tenant is actually entitled to, in one place, so no service anywhere hardcodes
/// `if (plan.Code == "premium")`. Resolution order: (1) a TenantEntitlementOverride for this tenant
/// and code, if one exists; (2) the tenant's assigned plan's PlanEntitlement for that code; (3) a
/// safe default — see the two "no plan assigned" notes below. This is deliberately the ONLY place
/// that walks Subscription → Plan → PlanEntitlement; everything else (RequireEntitlementAttribute,
/// the five limit-enforcement call sites) calls through this interface.
/// </summary>
public interface ITenantEntitlementService
{
    /// <summary>True if the tenant has no plan assigned (or no active subscription) — a
    /// grandfathered/demo tenant, always fully unrestricted. This is what keeps every tenant created
    /// without a plan (including every pre-Milestone-14 test) working exactly as before.</summary>
    Task<bool> HasUnrestrictedAccessAsync(Guid tenantId, CancellationToken ct = default);

    /// <summary>True unless a resolved PlanEntitlement/override explicitly sets this Feature code to
    /// false. Defaults to true for an unknown code or a tenant with unrestricted access.</summary>
    Task<bool> IsFeatureEnabledAsync(Guid tenantId, string featureCode, CancellationToken ct = default);

    /// <summary>Null means unlimited. Defaults to null (unlimited) for an unknown code or a tenant
    /// with unrestricted access.</summary>
    Task<long?> GetLimitAsync(Guid tenantId, string limitCode, CancellationToken ct = default);

    /// <summary>Every known entitlement code resolved for this tenant — powers the tenant-facing
    /// "enabled features" billing view and the platform admin's per-tenant entitlement inspector.</summary>
    Task<IReadOnlyList<TenantEntitlementDto>> GetEffectiveEntitlementsAsync(Guid tenantId, CancellationToken ct = default);

    Task<IReadOnlyList<TenantEntitlementOverrideDto>> ListOverridesAsync(Guid tenantId, CancellationToken ct = default);
    Task SetOverrideAsync(Guid tenantId, SetTenantEntitlementOverrideRequest request, CancellationToken ct = default);
    Task RemoveOverrideAsync(Guid tenantId, string code, CancellationToken ct = default);
}
