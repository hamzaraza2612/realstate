using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Portal;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// Deliberately plain [Authorize] (internal auth), not [RequirePortal] — see IAgentPortalService's
/// doc comment for why an agent uses their existing internal AppUser session rather than a new
/// external identity. Every action is self-scoped to the caller's own UserId inside
/// IAgentPortalService (same self-scoping precedent as NotificationsController), so no
/// [RequirePermission] is needed on top.
/// </summary>
[Authorize]
[Route("api/v1/agent-portal")]
public class AgentPortalController : ApiControllerBase
{
    private readonly IAgentPortalService _service;

    public AgentPortalController(IAgentPortalService service)
    {
        _service = service;
    }

    [HttpGet("leads")]
    public async Task<IActionResult> ListMyLeads([FromQuery] PagedRequest request, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListMyLeadsAsync(request, ct)));
    }

    [HttpGet("customers")]
    public async Task<IActionResult> ListMyCustomers(CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.ListMyCustomersAsync(ct)));
    }

    [HttpGet("available-inventory")]
    public async Task<IActionResult> ListAvailableInventory([FromQuery] PagedRequest request, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListAvailableInventoryAsync(request, ct)));
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> ListMyBookings([FromQuery] PagedRequest request, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListMyBookingsAsync(request, ct)));
    }

    [HttpGet("follow-ups")]
    public async Task<IActionResult> ListMyFollowUps([FromQuery] PagedRequest request, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _service.ListMyFollowUpsAsync(request, ct)));
    }

    [HttpGet("performance")]
    public async Task<IActionResult> GetMyPerformance([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        return Ok(ApiResponse.Ok(await _service.GetMyPerformanceAsync(from, to, ct)));
    }
}
