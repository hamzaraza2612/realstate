using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Receivables;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/receivables")]
public class ReceivablesController : ApiControllerBase
{
    private readonly IReceivableService _receivableService;

    public ReceivablesController(IReceivableService receivableService)
    {
        _receivableService = receivableService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] ReceivableFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _receivableService.ListAsync(request, filter, ct)));
    }
}
