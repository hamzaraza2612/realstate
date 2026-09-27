using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin management of the global TaxProfile/TaxRate catalog (Milestone 15) — never
/// reachable by a tenant token. See docs/TAX_ENGINE.md.</summary>
[Route("api/v1/platform/tax-profiles")]
public class PlatformTaxProfilesController : PlatformControllerBase
{
    private readonly ITaxProfileService _taxProfileService;

    public PlatformTaxProfilesController(ITaxProfileService taxProfileService, ITenantContext tenantContext) : base(tenantContext)
    {
        _taxProfileService = taxProfileService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? countryCode, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _taxProfileService.ListAsync(countryCode, ct)));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _taxProfileService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTaxProfileRequest request, CancellationToken ct)
    {
        var result = await _taxProfileService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTaxProfileRequest request, CancellationToken ct)
    {
        var result = await _taxProfileService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/rates")]
    public async Task<IActionResult> AddRate(Guid id, CreateTaxRateRequest request, CancellationToken ct)
    {
        var result = await _taxProfileService.AddRateAsync(id, request, ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}/rates/{rateId:guid}")]
    public async Task<IActionResult> UpdateRate(Guid id, Guid rateId, UpdateTaxRateRequest request, CancellationToken ct)
    {
        var result = await _taxProfileService.UpdateRateAsync(id, rateId, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
