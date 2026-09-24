using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Owners;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/owners")]
public class PropertyOwnersController : ApiControllerBase
{
    private readonly IPropertyOwnerService _service;

    public PropertyOwnersController(IPropertyOwnerService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] PropertyOwnerFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _service.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Create(CreatePropertyOwnerRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdatePropertyOwnerRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{ownerId:guid}/properties/{propertyId:guid}")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> LinkProperty(Guid ownerId, Guid propertyId, CancellationToken ct)
    {
        var result = await _service.LinkPropertyAsync(propertyId, ownerId, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("properties/{propertyId:guid}/link")]
    [RequirePermission(Permissions.Property.Manage)]
    public async Task<IActionResult> UnlinkProperty(Guid propertyId, CancellationToken ct)
    {
        var result = await _service.LinkPropertyAsync(propertyId, null, ct);
        return result.Succeeded ? NoContent() : NotFound(new { title = result.Error, status = 404 });
    }
}
