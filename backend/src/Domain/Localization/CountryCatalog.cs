namespace RealEstateErp.Domain.Localization;

/// <summary>
/// A country's static reference metadata: ISO codes, sensible defaults, and a pointer to the
/// platform TaxProfile code that applies there (if one has been configured — see TaxProfile).
/// Deliberately a compile-time catalog (mirrors Shared.Security.Permissions/EntitlementCodes),
/// not a database table: this is read-only reference data maintained by the platform, not
/// tenant-editable business data, and a hand-maintained list of ~10 countries needs no migration
/// machinery. Adding a new country is a one-line addition here, not a schema change.
/// </summary>
public record CountryInfo(
    string Alpha2,
    string Alpha3,
    string Name,
    string DefaultCurrency,
    string DefaultLocale,
    string DefaultTimezone,
    string PhoneCountryCode,
    string? DefaultTaxProfileCode);

public static class CountryCatalog
{
    public static readonly IReadOnlyDictionary<string, CountryInfo> All = new Dictionary<string, CountryInfo>(StringComparer.OrdinalIgnoreCase)
    {
        ["AE"] = new("AE", "ARE", "United Arab Emirates", "AED", "en-AE", "Asia/Dubai", "+971", "AE_VAT"),
        ["SA"] = new("SA", "SAU", "Saudi Arabia", "SAR", "ar-SA", "Asia/Riyadh", "+966", "SA_VAT"),
        ["PK"] = new("PK", "PAK", "Pakistan", "PKR", "en-PK", "Asia/Karachi", "+92", null),
        ["GB"] = new("GB", "GBR", "United Kingdom", "GBP", "en-GB", "Europe/London", "+44", null),
        ["US"] = new("US", "USA", "United States", "USD", "en-US", "America/New_York", "+1", null),
        ["QA"] = new("QA", "QAT", "Qatar", "QAR", "en-QA", "Asia/Qatar", "+974", null),
        ["BH"] = new("BH", "BHR", "Bahrain", "BHD", "en-BH", "Asia/Bahrain", "+973", null),
        ["KW"] = new("KW", "KWT", "Kuwait", "KWD", "en-KW", "Asia/Kuwait", "+965", null),
        ["OM"] = new("OM", "OMN", "Oman", "OMR", "en-OM", "Asia/Muscat", "+968", null),
    };

    public static CountryInfo? Find(string? alpha2) => alpha2 is not null && All.TryGetValue(alpha2, out var info) ? info : null;

    public static bool IsKnown(string alpha2) => All.ContainsKey(alpha2);
}
