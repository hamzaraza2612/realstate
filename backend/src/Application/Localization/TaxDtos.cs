using FluentValidation;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Localization;

public record TaxRateDto(
    Guid Id, Guid TaxProfileId, string RateCode, string Name, decimal Percentage, bool IsInclusive,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive);

public record TaxProfileDto(
    Guid Id, string CountryCode, string Code, string Name, string? Description, bool IsActive,
    IReadOnlyList<TaxRateDto> Rates);

public record CreateTaxProfileRequest(string CountryCode, string Code, string Name, string? Description);
public record UpdateTaxProfileRequest(string Name, string? Description, bool IsActive);

public record CreateTaxRateRequest(
    string RateCode, string Name, decimal Percentage, bool IsInclusive, DateOnly EffectiveFrom, DateOnly? EffectiveTo);
public record UpdateTaxRateRequest(
    string Name, decimal Percentage, bool IsInclusive, DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive);

/// <summary>Platform-admin management of the global TaxProfile/TaxRate catalog. Never reachable by a
/// tenant token — see Permissions.Localization.ManageTaxCatalog and PlatformControllerBase.</summary>
public interface ITaxProfileService
{
    Task<IReadOnlyList<TaxProfileDto>> ListAsync(string? countryCode = null, CancellationToken ct = default);
    Task<Result<TaxProfileDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<TaxProfileDto>> CreateAsync(CreateTaxProfileRequest request, CancellationToken ct = default);
    Task<Result<TaxProfileDto>> UpdateAsync(Guid id, UpdateTaxProfileRequest request, CancellationToken ct = default);
    Task<Result<TaxRateDto>> AddRateAsync(Guid taxProfileId, CreateTaxRateRequest request, CancellationToken ct = default);
    Task<Result<TaxRateDto>> UpdateRateAsync(Guid taxProfileId, Guid rateId, UpdateTaxRateRequest request, CancellationToken ct = default);
}

/// <summary>The result of computing tax for one amount, always deterministic given the same
/// (countryCode, rateCode, asOf): every field here is what gets snapshotted onto an Invoice, so a
/// later change to the referenced TaxRate's Percentage never alters a historical invoice. Applied is
/// false (Percentage 0, TaxAmount 0) when no active TaxProfile/TaxRate is configured for the country
/// — a deliberate, non-blocking default (not every tenant or transaction has an applicable tax).</summary>
public record TaxCalculationResult(
    bool Applied, Guid? TaxRateId, string? TaxProfileCode, string? RateCode, string? RateName,
    decimal Percentage, bool IsInclusive, decimal Subtotal, decimal TaxAmount, decimal Total);

/// <summary>
/// The tax engine's calculation boundary — the ONLY place invoice/business services compute a tax
/// amount. Never hardcodes a percentage; always resolves the country's active TaxProfile and the
/// requested (or default "STANDARD") TaxRate as of a given date. See docs/TAX_ENGINE.md.
/// </summary>
public interface ITaxCalculationService
{
    Task<TaxCalculationResult> CalculateAsync(string countryCode, string? rateCode, decimal amount, DateOnly asOf, CancellationToken ct = default);

    /// <summary>Active rates for a country's tax profile as of today — used by the tenant-facing
    /// Settings > Localization page to show "what tax applies here" without granting catalog-edit access.</summary>
    Task<IReadOnlyList<TaxRateDto>> GetActiveRatesForCountryAsync(string countryCode, CancellationToken ct = default);
}

public class CreateTaxProfileRequestValidator : AbstractValidator<CreateTaxProfileRequest>
{
    public CreateTaxProfileRequestValidator()
    {
        RuleFor(x => x.CountryCode).NotEmpty().Length(2);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class CreateTaxRateRequestValidator : AbstractValidator<CreateTaxRateRequest>
{
    public CreateTaxRateRequestValidator()
    {
        RuleFor(x => x.RateCode).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Percentage).GreaterThanOrEqualTo(0).LessThanOrEqualTo(100);
        RuleFor(x => x.EffectiveFrom).NotEmpty();
    }
}
