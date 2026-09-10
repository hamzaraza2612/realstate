using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.AuditLogs;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/audit-logs")]
public class AuditLogsController : ApiControllerBase
{
    private readonly IAuditLogQueryService _auditLogQueryService;

    public AuditLogsController(IAuditLogQueryService auditLogQueryService)
    {
        _auditLogQueryService = auditLogQueryService;
    }

    [HttpGet]
    [RequirePermission(Permissions.AuditLogs.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] AuditLogFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _auditLogQueryService.ListAsync(request, filter, ct)));
    }
}
