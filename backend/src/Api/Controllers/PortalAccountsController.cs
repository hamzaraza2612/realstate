using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Portal;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>Internal-staff administration of portal logins — see IPortalAccountService's doc comment
/// for why one permission covers every actor type.</summary>
[Authorize]
[RequirePermission(Permissions.Portal.ManageAccounts)]
[Route("api/v1/portal-accounts")]
public class PortalAccountsController : ApiControllerBase
{
    private readonly IPortalAccountService _service;

    public PortalAccountsController(IPortalAccountService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] PortalAccountFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListAsync(request, filter, ct)));
    }

    [HttpPost("invite")]
    public async Task<IActionResult> Invite(InvitePortalAccountRequest request, CancellationToken ct)
    {
        var result = await _service.InviteAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var result = await _service.DeactivateAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id, CancellationToken ct)
    {
        var result = await _service.ReactivateAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
