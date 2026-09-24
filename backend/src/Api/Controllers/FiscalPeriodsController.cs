using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.FiscalPeriods;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/fiscal-periods")]
public class FiscalPeriodsController : ApiControllerBase
{
    private readonly IFiscalPeriodService _fiscalPeriodService;

    public FiscalPeriodsController(IFiscalPeriodService fiscalPeriodService)
    {
        _fiscalPeriodService = fiscalPeriodService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _fiscalPeriodService.ListAsync(ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Create(CreateFiscalPeriodRequest request, CancellationToken ct)
    {
        var result = await _fiscalPeriodService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/close")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Close(Guid id, CancellationToken ct)
    {
        var result = await _fiscalPeriodService.CloseAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/reopen")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Reopen(Guid id, CancellationToken ct)
    {
        var result = await _fiscalPeriodService.ReopenAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
