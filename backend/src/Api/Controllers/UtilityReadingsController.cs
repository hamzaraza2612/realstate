using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Utilities;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/utility-readings")]
public class UtilityReadingsController : ApiControllerBase
{
    private readonly IUtilityReadingService _utilityReadingService;

    public UtilityReadingsController(IUtilityReadingService utilityReadingService)
    {
        _utilityReadingService = utilityReadingService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] UtilityReadingFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _utilityReadingService.ListAsync(request, filter, ct)));
    }

    [HttpPost]
    [RequirePermission(Permissions.Facility.Manage)]
    public async Task<IActionResult> Create(CreateUtilityReadingRequest request, CancellationToken ct)
    {
        var result = await _utilityReadingService.CreateAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
