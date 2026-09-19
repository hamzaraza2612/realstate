using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Construction.Expenses;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/construction/expenses")]
public class ExpensesController : ApiControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] ExpenseFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _expenseService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Construction.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _expenseService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Construction.ProjectManage)]
    public async Task<IActionResult> Create(CreateExpenseRequest request, CancellationToken ct)
    {
        var result = await _expenseService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/approve")]
    [RequirePermission(Permissions.Procurement.OrderApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var result = await _expenseService.ApproveAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/reject")]
    [RequirePermission(Permissions.Procurement.OrderApprove)]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var result = await _expenseService.RejectAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
