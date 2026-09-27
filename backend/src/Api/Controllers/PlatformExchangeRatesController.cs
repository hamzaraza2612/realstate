using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin management of the manual FX rate seam (Milestone 15) — no external FX
/// provider is called; SetRate is how a platform admin records a rate by hand. See
/// docs/LOCALIZATION.md.</summary>
[Route("api/v1/platform/exchange-rates")]
public class PlatformExchangeRatesController : PlatformControllerBase
{
    private readonly IExchangeRateService _exchangeRateService;

    public PlatformExchangeRatesController(IExchangeRateService exchangeRateService, ITenantContext tenantContext) : base(tenantContext)
    {
        _exchangeRateService = exchangeRateService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] string? baseCurrency, [FromQuery] string? quoteCurrency, CancellationToken ct) =>
        Ok(ApiResponse.Paged(await _exchangeRateService.ListAsync(request, baseCurrency, quoteCurrency, ct)));

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatest([FromQuery] string baseCurrency, [FromQuery] string quoteCurrency, CancellationToken ct)
    {
        var result = await _exchangeRateService.GetLatestRateAsync(baseCurrency, quoteCurrency, null, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404, code = result.ErrorCode });
    }

    [HttpPost]
    public async Task<IActionResult> SetRate(SetExchangeRateRequest request, CancellationToken ct)
    {
        var result = await _exchangeRateService.SetRateAsync(request, ct);
        return Ok(ApiResponse.Ok(result.Value));
    }
}
