using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Procurement.Vendors;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/procurement/vendors")]
public class VendorsController : ApiControllerBase
{
    private readonly IVendorService _vendorService;

    public VendorsController(IVendorService vendorService)
    {
        _vendorService = vendorService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] VendorFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _vendorService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Procurement.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _vendorService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Create(CreateVendorRequest request, CancellationToken ct)
    {
        var result = await _vendorService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Update(Guid id, UpdateVendorRequest request, CancellationToken ct)
    {
        var result = await _vendorService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Procurement.OrderManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _vendorService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
