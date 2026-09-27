using FluentValidation;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Localization;

public record TenantTaxProfileDto(
    Guid? TaxProfileId, string? TaxProfileCode, string? TaxProfileName, string? TaxRegistrationNumber,
    string? LegalEntityName, string? LegalAddressLine1, string? LegalAddressLine2, string? LegalCity,
    string? LegalStateOrProvince, string? LegalPostalCode, string? LegalCountryCode);

public record UpdateTenantTaxProfileRequest(
    Guid? TaxProfileId, string? TaxRegistrationNumber, string? LegalEntityName, string? LegalAddressLine1,
    string? LegalAddressLine2, string? LegalCity, string? LegalStateOrProvince, string? LegalPostalCode,
    string? LegalCountryCode);

/// <summary>Tenant-owned tax registration/legal-entity details, distinct from the platform's
/// TaxProfile/TaxRate catalog (ITaxProfileService) — a tenant may only pick which existing platform
/// TaxProfile applies to it and record its own registration number/legal address; it can never create
/// or edit a TaxProfile/TaxRate itself. See docs/TAX_ENGINE.md.</summary>
public interface ITenantTaxProfileService
{
    Task<Result<TenantTaxProfileDto>> GetCurrentAsync(CancellationToken ct = default);
    Task<Result<TenantTaxProfileDto>> UpdateCurrentAsync(UpdateTenantTaxProfileRequest request, CancellationToken ct = default);
}

public class UpdateTenantTaxProfileRequestValidator : AbstractValidator<UpdateTenantTaxProfileRequest>
{
    public UpdateTenantTaxProfileRequestValidator()
    {
        RuleFor(x => x.TaxRegistrationNumber).MaximumLength(50);
        RuleFor(x => x.LegalEntityName).MaximumLength(200);
    }
}
