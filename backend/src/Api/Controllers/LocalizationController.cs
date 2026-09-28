using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Localization;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// Tenant-facing localization: read-only country/currency reference catalogs (no permission gate —
/// static, non-sensitive data every authenticated user may read, the same posture as e.g. entitlement
/// codes), the current tenant's own localization profile (Settings > Localization), the active tax
/// rates for a country (read-only preview, never catalog editing), and the tenant's own tax
/// registration/legal-entity details. Never cross-tenant — every action reads/writes only the ambient
/// tenant, the same "no id parameter anywhere" pattern as SubscriptionController/BillingController.
/// See docs/LOCALIZATION.md and docs/TAX_ENGINE.md.
/// </summary>
[Authorize]
[Route("api/v1/localization")]
public class LocalizationController : ApiControllerBase
{
    private readonly ILocalizationService _localizationService;
    private readonly ITaxCalculationService _taxCalculationService;
    private readonly ITenantTaxProfileService _tenantTaxProfileService;

    public LocalizationController(
        ILocalizationService localizationService, ITaxCalculationService taxCalculationService,
        ITenantTaxProfileService tenantTaxProfileService)
    {
        _localizationService = localizationService;
        _taxCalculationService = taxCalculationService;
        _tenantTaxProfileService = tenantTaxProfileService;
    }

    [HttpGet("countries")]
    public IActionResult ListCountries() => Ok(ApiResponse.Ok(_localizationService.ListCountries()));

    [HttpGet("currencies")]
    public IActionResult ListCurrencies() => Ok(ApiResponse.Ok(_localizationService.ListCurrencies()));

    [HttpGet("tax-rates")]
    public async Task<IActionResult> GetTaxRates([FromQuery] string countryCode, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _taxCalculationService.GetActiveRatesForCountryAsync(countryCode, ct)));

    [HttpGet("current")]
    [RequirePermission(Permissions.Organizations.View)]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var result = await _localizationService.GetCurrentAsync(ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPut("current")]
    [RequirePermission(Permissions.Organizations.Manage)]
    public async Task<IActionResult> UpdateCurrent(UpdateTenantLocalizationRequest request, CancellationToken ct)
    {
        var result = await _localizationService.UpdateCurrentAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("tax-profile")]
    [RequirePermission(Permissions.Organizations.View)]
    public async Task<IActionResult> GetTaxProfile(CancellationToken ct)
    {
        var result = await _tenantTaxProfileService.GetCurrentAsync(ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPut("tax-profile")]
    [RequirePermission(Permissions.Organizations.Manage)]
    public async Task<IActionResult> UpdateTaxProfile(UpdateTenantTaxProfileRequest request, CancellationToken ct)
    {
        var result = await _tenantTaxProfileService.UpdateCurrentAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
