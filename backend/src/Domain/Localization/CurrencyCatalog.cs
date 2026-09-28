namespace RealEstateErp.Domain.Localization;

/// <summary>
/// ISO 4217 currency reference metadata. A compile-time catalog for the same reason as
/// CountryCatalog — this is fixed reference data (a currency's decimal precision, symbol, and name
/// are defined by the ISO standard, not tenant configuration). DecimalPlaces matters for correct
/// rounding: most currencies use 2, but e.g. BHD/KWD/OMR use 3 and some currencies use 0 — code
/// that formats or rounds money must read this rather than assuming 2 everywhere.
/// </summary>
public record CurrencyInfo(string Code, string Name, string Symbol, int DecimalPlaces);

public static class CurrencyCatalog
{
    public static readonly IReadOnlyDictionary<string, CurrencyInfo> All = new Dictionary<string, CurrencyInfo>(StringComparer.OrdinalIgnoreCase)
    {
        ["AED"] = new("AED", "UAE Dirham", "د.إ", 2),
        ["SAR"] = new("SAR", "Saudi Riyal", "﷼", 2),
        ["PKR"] = new("PKR", "Pakistani Rupee", "₨", 2),
        ["USD"] = new("USD", "US Dollar", "$", 2),
        ["EUR"] = new("EUR", "Euro", "€", 2),
        ["GBP"] = new("GBP", "British Pound", "£", 2),
        ["QAR"] = new("QAR", "Qatari Riyal", "ر.ق", 2),
        ["BHD"] = new("BHD", "Bahraini Dinar", ".د.ب", 3),
        ["KWD"] = new("KWD", "Kuwaiti Dinar", "د.ك", 3),
        ["OMR"] = new("OMR", "Omani Rial", "ر.ع.", 3),
    };

    public static CurrencyInfo? Find(string? code) => code is not null && All.TryGetValue(code, out var info) ? info : null;

    public static int DecimalPlacesFor(string code) => Find(code)?.DecimalPlaces ?? 2;

    /// <summary>Rounds using the currency's own decimal precision (never a hardcoded 2) — the
    /// deterministic rounding rule every tax/invoice calculation in this milestone uses.</summary>
    public static decimal Round(decimal amount, string currencyCode) =>
        Math.Round(amount, DecimalPlacesFor(currencyCode), MidpointRounding.AwayFromZero);
}
