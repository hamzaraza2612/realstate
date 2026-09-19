using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Finance.Journal;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/finance/journal-entries")]
public class JournalEntriesController : ApiControllerBase
{
    private readonly IJournalService _journalService;

    public JournalEntriesController(IJournalService journalService)
    {
        _journalService = journalService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] JournalEntryFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _journalService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Finance.ReportsView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _journalService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Create(CreateJournalEntryRequest request, CancellationToken ct)
    {
        var result = await _journalService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/post")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Post(Guid id, CancellationToken ct)
    {
        var result = await _journalService.PostAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.Finance.Manage)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _journalService.CancelAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}
