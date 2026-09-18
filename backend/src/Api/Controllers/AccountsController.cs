using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Accounts;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/accounts")]
public class AccountsController : ApiControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] AccountFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _accountService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _accountService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Create(CreateAccountRequest request, CancellationToken ct)
    {
        var result = await _accountService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Update(Guid id, UpdateAccountRequest request, CancellationToken ct)
    {
        var result = await _accountService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _accountService.DeleteAsync(id, ct);
        if (result.Succeeded) return NoContent();
        return result.ErrorCode == "not_found"
            ? NotFound(new { title = result.Error, status = 404 })
            : Conflict(new { title = result.Error, status = 409, code = result.ErrorCode });
    }
}
