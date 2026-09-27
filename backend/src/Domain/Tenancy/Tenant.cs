using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Tenancy;

public enum TenantStatus
{
    Trial = 0,
    Active = 1,
    Suspended = 2,
    Cancelled = 3
}

public static class TenantStatusExtensions
{
    /// <summary>Trial and Active tenants may authenticate and use the API; Suspended/Cancelled may not.
    /// Centralized here so login, refresh, and the per-request enforcement middleware can never drift.</summary>
    public static bool IsUsable(this TenantStatus status) => status is TenantStatus.Trial or TenantStatus.Active;
}

public enum MeasurementSystem
{
    Metric = 0,
    Imperial = 1
}

/// <summary>A tenant is a customer organization (real-estate company, developer, property manager, etc.) on the platform.</summary>
public class Tenant : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public TenantStatus Status { get; set; } = TenantStatus.Trial;
    public string Timezone { get; set; } = "UTC";
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public Guid? SubscriptionPlanId { get; set; }
    public DateTimeOffset? TrialEndsAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // --- Localization profile (Milestone 15) ---------------------------------------------------
    // The tenant is the single source of truth for locale/currency/language, per docs/LOCALIZATION.md:
    // no business entity duplicates these values, and no second per-tenant "settings" table exists
    // for them — Timezone above (Milestone 10) is reused as-is rather than duplicated here.

    /// <summary>ISO 3166-1 alpha-2 — see Domain.Localization.CountryCatalog. Not a foreign key
    /// (the catalog is compile-time); an unrecognized code is still stored as-is (a tenant in a
    /// country this milestone's catalog doesn't list yet is not blocked from existing).</summary>
    public string CountryCode { get; set; } = "US";

    /// <summary>ISO 4217 — see Domain.Localization.CurrencyCatalog. This is the tenant's one
    /// operating currency for its ERP modules (Finance/Sales/Property/Facility); see
    /// docs/LOCALIZATION.md "Finance & Currency Strategy" for why those modules carry no separate
    /// per-row currency column.</summary>
    public string Currency { get; set; } = "USD";

    /// <summary>BCP-47 locale tag, e.g. "en-AE", "ar-SA" — drives number/date formatting.</summary>
    public string Locale { get; set; } = "en-US";

    /// <summary>.NET custom date format string used by generated documents (e.g. invoices); the
    /// frontend derives its own display format from Locale instead of parsing this.</summary>
    public string DateFormat { get; set; } = "MM/dd/yyyy";

    public DayOfWeek FirstDayOfWeek { get; set; } = DayOfWeek.Sunday;

    /// <summary>ISO 639-1 UI language code, e.g. "en", "ar".</summary>
    public string DefaultLanguage { get; set; } = "en";

    /// <summary>Comma-separated ISO 639-1 codes the tenant additionally allows users to switch to.</summary>
    public string? SecondaryLanguages { get; set; }

    public MeasurementSystem MeasurementSystem { get; set; } = MeasurementSystem.Imperial;
}
