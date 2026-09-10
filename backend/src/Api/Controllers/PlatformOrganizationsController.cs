using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin management of tenant organizations across the whole platform.</summary>
[Route("api/v1/platform/organizations")]
public class PlatformOrganizationsController : PlatformControllerBase
{
    private readonly IOrganizationService _organizationService;

    public PlatformOrganizationsController(IOrganizationService organizationService, ITenantContext tenantContext) : base(tenantContext)
    {
        _organizationService = organizationService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] string? search, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _organizationService.ListAsync(request, search, ct)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _organizationService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrganizationRequest request, CancellationToken ct)
    {
        var result = await _organizationService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateOrganizationStatusRequest request, CancellationToken ct)
    {
        var result = await _organizationService.UpdateStatusAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
