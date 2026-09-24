using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Communication;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>Diagnostic/support visibility into what ICommunicationService actually sent, skipped, or
/// failed — gated by the same permission as AuditLogs since it's the same kind of cross-cutting,
/// sensitive, all-module-spanning data.</summary>
[Authorize]
[Route("api/v1/communication-logs")]
public class CommunicationLogsController : ApiControllerBase
{
    private readonly ICommunicationLogQueryService _queryService;

    public CommunicationLogsController(ICommunicationLogQueryService queryService)
    {
        _queryService = queryService;
    }

    [HttpGet]
    [RequirePermission(Permissions.AuditLogs.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] CommunicationLogFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _queryService.ListAsync(request, filter, ct)));
    }
}
