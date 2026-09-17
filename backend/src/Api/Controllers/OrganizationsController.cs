using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>The current tenant's own organization profile — never cross-tenant.</summary>
[Authorize]
[Route("api/v1/organizations")]
public class OrganizationsController : ApiControllerBase
{
    private readonly IOrganizationService _organizationService;

    public OrganizationsController(IOrganizationService organizationService)
    {
        _organizationService = organizationService;
    }

    [HttpGet("me")]
    [RequirePermission(Permissions.Organizations.View)]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var result = await _organizationService.GetCurrentAsync(ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPut("me")]
    [RequirePermission(Permissions.Organizations.Manage)]
    public async Task<IActionResult> UpdateCurrent(UpdateOrganizationRequest request, CancellationToken ct)
    {
        var current = await _organizationService.GetCurrentAsync(ct);
        if (!current.Succeeded) return NotFound(new { title = current.Error, status = 404 });

        var result = await _organizationService.UpdateAsync(current.Value!.Id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400 });
    }
}
