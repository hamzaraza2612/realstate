using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Ai;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// The Business Command Center's landing-page endpoint — Business Health + What Needs Attention +
/// recent conversations in one call. Gated by the "ai" plan entitlement (whole feature) and
/// Permissions.Ai.View (which users within an entitled tenant may use it) — see docs/AI_ARCHITECTURE.md.
/// </summary>
[Authorize]
[RequireEntitlement(EntitlementCodes.Ai)]
[Route("api/v1/ai/command-center")]
public class CommandCenterController : ApiControllerBase
{
    private readonly ICommandCenterService _commandCenterService;

    public CommandCenterController(ICommandCenterService commandCenterService)
    {
        _commandCenterService = commandCenterService;
    }

    [HttpGet("summary")]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> Summary(CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _commandCenterService.GetSummaryAsync(ct)));
}
