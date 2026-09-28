using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Localization;

/// <summary>The tax engine's calculation boundary — see ITaxCalculationService. Reads TaxProfile/
/// TaxRate rows only (never a hardcoded percentage), and is deterministic: the same
/// (countryCode, rateCode, amount, asOf) always yields the same result, because it always resolves to
/// the same historical TaxRate row given EffectiveFrom/EffectiveTo. See docs/TAX_ENGINE.md.</summary>
public class TaxCalculationService : ITaxCalculationService
{
    private const string DefaultRateCode = "STANDARD";
    private readonly AppDbContext _db;

    public TaxCalculationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<TaxCalculationResult> CalculateAsync(string countryCode, string? rateCode, decimal amount, DateOnly asOf, CancellationToken ct = default)
    {
        var code = string.IsNullOrWhiteSpace(rateCode) ? DefaultRateCode : rateCode;

        var rate = await _db.TaxRates
            .Include(r => r.TaxProfile)
            .Where(r => r.TaxProfile!.CountryCode == countryCode && r.TaxProfile.IsActive && r.IsActive
                        && r.RateCode == code && r.EffectiveFrom <= asOf && (r.EffectiveTo == null || r.EffectiveTo >= asOf))
            // Ties on EffectiveFrom (e.g. two active profiles for the same country) are broken by
            // most-recently-created, so the result stays deterministic rather than DB-order-dependent.
            .OrderByDescending(r => r.EffectiveFrom).ThenByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (rate is null)
        {
            return new TaxCalculationResult(false, null, null, null, null, 0, false, amount, 0, amount);
        }

        var currency = CountryCatalog.Find(countryCode)?.DefaultCurrency ?? "USD";
        decimal taxAmount, subtotal, total;

        if (rate.IsInclusive)
        {
            // `amount` already includes tax: back it out rather than adding on top.
            subtotal = CurrencyCatalog.Round(amount / (1 + rate.Percentage / 100m), currency);
            taxAmount = CurrencyCatalog.Round(amount - subtotal, currency);
            total = amount;
        }
        else
        {
            subtotal = amount;
            taxAmount = CurrencyCatalog.Round(amount * rate.Percentage / 100m, currency);
            total = subtotal + taxAmount;
        }

        return new TaxCalculationResult(true, rate.Id, rate.TaxProfile!.Code, rate.RateCode, rate.Name, rate.Percentage, rate.IsInclusive, subtotal, taxAmount, total);
    }

    public async Task<IReadOnlyList<TaxRateDto>> GetActiveRatesForCountryAsync(string countryCode, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rates = await _db.TaxRates
            .Include(r => r.TaxProfile)
            .Where(r => r.TaxProfile!.CountryCode == countryCode && r.TaxProfile.IsActive && r.IsActive
                        && r.EffectiveFrom <= today && (r.EffectiveTo == null || r.EffectiveTo >= today))
            .OrderBy(r => r.RateCode)
            .ToListAsync(ct);

        return rates.Select(r => new TaxRateDto(r.Id, r.TaxProfileId, r.RateCode, r.Name, r.Percentage, r.IsInclusive, r.EffectiveFrom, r.EffectiveTo, r.IsActive)).ToList();
    }
}
