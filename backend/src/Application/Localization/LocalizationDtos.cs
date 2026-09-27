using FluentValidation;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Localization;

public record CountryDto(
    string Alpha2, string Alpha3, string Name, string DefaultCurrency, string DefaultLocale,
    string DefaultTimezone, string PhoneCountryCode, string? DefaultTaxProfileCode);

public record CurrencyDto(string Code, string Name, string Symbol, int DecimalPlaces);

public record TenantLocalizationDto(
    string CountryCode, string Currency, string Locale, string Timezone, string DateFormat,
    DayOfWeek FirstDayOfWeek, string DefaultLanguage, IReadOnlyList<string> SecondaryLanguages,
    MeasurementSystem MeasurementSystem);

public record UpdateTenantLocalizationRequest(
    string CountryCode, string Currency, string Locale, string Timezone, string DateFormat,
    DayOfWeek FirstDayOfWeek, string DefaultLanguage, IReadOnlyList<string>? SecondaryLanguages,
    MeasurementSystem MeasurementSystem);

/// <summary>
/// Read-only country/currency reference catalogs, plus the tenant's own localization profile.
/// Reading the catalogs requires no special permission (they're non-sensitive static reference data,
/// needed by every tenant's Settings > Localization page); updating a tenant's own profile requires
/// Organizations.Manage (the same permission that already governs the rest of the tenant's org
/// profile) and can never affect another tenant — see docs/LOCALIZATION.md.
/// </summary>
public interface ILocalizationService
{
    IReadOnlyList<CountryDto> ListCountries();
    IReadOnlyList<CurrencyDto> ListCurrencies();

    Task<Result<TenantLocalizationDto>> GetCurrentAsync(CancellationToken ct = default);
    Task<Result<TenantLocalizationDto>> UpdateCurrentAsync(UpdateTenantLocalizationRequest request, CancellationToken ct = default);

    /// <summary>Platform-admin path for setting up a tenant's localization at/after creation.</summary>
    Task<Result<TenantLocalizationDto>> UpdateForTenantAsync(Guid tenantId, UpdateTenantLocalizationRequest request, CancellationToken ct = default);
}

public class UpdateTenantLocalizationRequestValidator : AbstractValidator<UpdateTenantLocalizationRequest>
{
    public UpdateTenantLocalizationRequestValidator()
    {
        RuleFor(x => x.CountryCode).NotEmpty().Length(2);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.Locale).NotEmpty();
        RuleFor(x => x.Timezone).NotEmpty();
        RuleFor(x => x.DateFormat).NotEmpty();
        RuleFor(x => x.DefaultLanguage).NotEmpty();
    }
}
