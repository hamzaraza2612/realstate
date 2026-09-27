using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Localization;

/// <summary>
/// One tenant's tax registration + legal-entity details — separate from the tenant's display/locale
/// settings (Tenant.CountryCode/Currency/Locale/etc., Milestone 15) because this is optional,
/// filled in over time, and specifically about tax/legal identity rather than UI presentation. One
/// row per tenant (unique TenantId), created lazily the first time a tenant configures it.
///
/// TaxRegistrationNumber is deliberately generic (not "Trn") — the same field represents a UAE TRN,
/// a Saudi VAT registration number, or any future country's equivalent; which one it *means* is
/// determined by TaxProfileId's country, not by the field name.
/// </summary>
public class TenantTaxProfile : TenantEntity
{
    /// <summary>Which platform TaxProfile (VAT scheme) this tenant is registered under, if any.
    /// Nullable: a tenant in a country with no configured tax profile (or that simply hasn't set
    /// this up yet) charges no tax — see ITaxCalculationService.</summary>
    public Guid? TaxProfileId { get; set; }
    public TaxProfile? TaxProfile { get; set; }

    public string? TaxRegistrationNumber { get; set; }
    public string? LegalEntityName { get; set; }
    public string? LegalAddressLine1 { get; set; }
    public string? LegalAddressLine2 { get; set; }
    public string? LegalCity { get; set; }
    public string? LegalStateOrProvince { get; set; }
    public string? LegalPostalCode { get; set; }
    public string? LegalCountryCode { get; set; }
}
