using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.AuditLogs;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>Cross-tenant audit log view for Super Admin platform oversight.</summary>
[Route("api/v1/platform/audit-logs")]
public class PlatformAuditLogsController : PlatformControllerBase
{
    private readonly IAuditLogQueryService _auditLogQueryService;

    public PlatformAuditLogsController(IAuditLogQueryService auditLogQueryService, ITenantContext tenantContext) : base(tenantContext)
    {
        _auditLogQueryService = auditLogQueryService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] AuditLogFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _auditLogQueryService.ListAsync(request, filter, ct)));
    }
}
