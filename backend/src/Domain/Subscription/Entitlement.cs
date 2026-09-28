using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Subscription;

public enum EntitlementType
{
    /// <summary>On/off access to a module or capability. Resolved value is a bool.</summary>
    Feature = 0,

    /// <summary>A numeric ceiling (e.g. max users). Resolved value is a nullable long — null means unlimited.</summary>
    Limit = 1
}

/// <summary>
/// Compile-time catalog of entitlement codes, exactly mirroring how Shared/Security/Permissions.cs
/// is a compile-time catalog of permission codes rather than a database table — the set of things a
/// plan CAN grant is part of the application's own module list, not tenant- or plan-editable data.
/// PlanEntitlement/TenantEntitlementOverride rows reference these codes as plain strings, the same
/// way PlanFeature.FeatureCode already did (this replaces PlanFeature/TenantFeatureEntitlement,
/// which existed but were never read anywhere in the codebase — see docs/SAAS_BILLING.md).
///
/// Only a representative subset of feature codes are actually enforced by [RequireEntitlement] in
/// this milestone (ExternalPortals, AdvancedReporting, Facility) — see docs/SAAS_BILLING.md for
/// which, and why extending enforcement to more modules is a one-attribute change, not new
/// architecture. Codes for modules that don't exist yet (AI, Mobile) are deliberately NOT defined
/// here; gating a feature that has no implementation to gate would be dead configuration.
/// </summary>
public static class EntitlementCodes
{
    // --- Feature entitlements (bool) ---
    public const string Crm = "crm";
    public const string Sales = "sales";
    public const string Finance = "finance";
    public const string Construction = "construction";
    public const string Procurement = "procurement";
    public const string Rental = "rental";
    public const string Facility = "facility";
    public const string Mall = "mall";
    public const string Coworking = "coworking";
    public const string ExternalPortals = "external_portals";
    public const string Documents = "documents";
    public const string Approvals = "approvals";
    public const string Reporting = "reporting";
    public const string AdvancedReporting = "advanced_reporting";
    public const string ApiAccess = "api_access";

    // --- Limit entitlements (numeric) ---
    public const string MaxUsers = "max_users";
    public const string MaxProperties = "max_properties";
    public const string MaxProjects = "max_projects";
    public const string MaxPortalUsers = "max_portal_users";
    public const string MaxStorageMb = "max_storage_mb";

    public static readonly IReadOnlyDictionary<string, EntitlementType> All = new Dictionary<string, EntitlementType>
    {
        [Crm] = EntitlementType.Feature,
        [Sales] = EntitlementType.Feature,
        [Finance] = EntitlementType.Feature,
        [Construction] = EntitlementType.Feature,
        [Procurement] = EntitlementType.Feature,
        [Rental] = EntitlementType.Feature,
        [Facility] = EntitlementType.Feature,
        [Mall] = EntitlementType.Feature,
        [Coworking] = EntitlementType.Feature,
        [ExternalPortals] = EntitlementType.Feature,
        [Documents] = EntitlementType.Feature,
        [Approvals] = EntitlementType.Feature,
        [Reporting] = EntitlementType.Feature,
        [AdvancedReporting] = EntitlementType.Feature,
        [ApiAccess] = EntitlementType.Feature,
        [MaxUsers] = EntitlementType.Limit,
        [MaxProperties] = EntitlementType.Limit,
        [MaxProjects] = EntitlementType.Limit,
        [MaxPortalUsers] = EntitlementType.Limit,
        [MaxStorageMb] = EntitlementType.Limit,
    };
}

/// <summary>A plan's default grant for one entitlement code. Exactly one of BoolValue/NumericValue is
/// meaningful, matching the code's EntitlementCodes.All[Code] type. NumericValue null means unlimited
/// for a Limit code.</summary>
public class PlanEntitlement : BaseEntity
{
    public Guid SubscriptionPlanId { get; set; }
    public SubscriptionPlan? SubscriptionPlan { get; set; }
    public string Code { get; set; } = default!;
    public bool? BoolValue { get; set; }
    public long? NumericValue { get; set; }
}

/// <summary>Per-tenant override of one entitlement code, independent of the assigned plan's default —
/// so a specific tenant can be sold a module a-la-carte or granted a one-off higher limit without a
/// new plan. Takes precedence over the plan's own PlanEntitlement when present.</summary>
public class TenantEntitlementOverride : TenantEntity
{
    public string Code { get; set; } = default!;
    public bool? BoolValue { get; set; }
    public long? NumericValue { get; set; }
}
