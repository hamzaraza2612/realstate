using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/crm/customers")]
public class CustomersController : ApiControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Crm.CustomerView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] CustomerFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _customerService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Crm.CustomerView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _customerService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Crm.CustomerManage)]
    public async Task<IActionResult> Create(CreateCustomerRequest request, CancellationToken ct)
    {
        var result = await _customerService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Crm.CustomerManage)]
    public async Task<IActionResult> Update(Guid id, UpdateCustomerRequest request, CancellationToken ct)
    {
        var result = await _customerService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}
