using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Localization;

/// <summary>
/// A named tax scheme for one country (e.g. "UAE VAT", "Saudi VAT") — platform-level reference
/// data, not tenant-owned (BaseEntity, not TenantEntity), the same convention as SubscriptionPlan:
/// a Super Admin defines it once, every tenant in that country reads the same rows. A tenant never
/// gets its own copy and never edits it directly (see Permissions.Localization.ManageTaxCatalog).
/// </summary>
public class TaxProfile : BaseEntity
{
    /// <summary>ISO 3166-1 alpha-2 — see CountryCatalog. Not a foreign key: the catalog is compile-time.</summary>
    public string CountryCode { get; set; } = default!;

    /// <summary>Stable machine code, e.g. "AE_VAT" — referenced by CountryCatalog.DefaultTaxProfileCode
    /// and by tenants that select this profile. Unique.</summary>
    public string Code { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<TaxRate> Rates { get; set; } = new List<TaxRate>();
}

/// <summary>
/// One versioned rate under a TaxProfile — e.g. "STANDARD" at 5%, "ZERO_RATED" at 0%. Historical
/// invoices reference the specific TaxRate row (by id, snapshotted) that was active when they were
/// generated, via Invoice.TaxRateId/TaxRateName/TaxPercentage/TaxInclusive — so raising a rate's
/// Percentage later, or closing it out with EffectiveTo and adding a new row, never changes what an
/// already-issued invoice shows. See docs/TAX_ENGINE.md.
/// </summary>
public class TaxRate : BaseEntity
{
    public Guid TaxProfileId { get; set; }
    public TaxProfile? TaxProfile { get; set; }

    /// <summary>e.g. "STANDARD", "ZERO_RATED", "EXEMPT" — unique within its TaxProfile.</summary>
    public string RateCode { get; set; } = default!;
    public string Name { get; set; } = default!;

    /// <summary>e.g. 5.00 for 5%. Never hardcoded in application/business logic — always read from here.</summary>
    public decimal Percentage { get; set; }

    /// <summary>True if Percentage is already included in the quoted amount (tax-inclusive pricing);
    /// false (the common case for B2B SaaS billing) means tax is added on top of the subtotal.</summary>
    public bool IsInclusive { get; set; }

    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
}
