using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Ai;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>
/// "Ask Your Business" conversations — every method is scoped to the caller's own conversations
/// (AiConversationService checks UserId, not just the ambient tenant filter); there is no admin
/// endpoint anywhere that lists another user's AI conversations. See docs/AI_ARCHITECTURE.md.
/// </summary>
[Authorize]
[RequireEntitlement(EntitlementCodes.Ai)]
[Route("api/v1/ai/conversations")]
public class AiConversationsController : ApiControllerBase
{
    private readonly IAiConversationService _conversationService;

    public AiConversationsController(IAiConversationService conversationService)
    {
        _conversationService = conversationService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, CancellationToken ct) =>
        Ok(ApiResponse.Paged(await _conversationService.ListMineAsync(request, ct)));

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _conversationService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> Create(CreateAiConversationRequest request, CancellationToken ct)
    {
        var result = await _conversationService.CreateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    /// <summary>The core "Ask Your Business" turn. Failure codes worth distinguishing in the frontend:
    /// ai_provider_not_configured (show the unavailable state, per docs/AI_ARCHITECTURE.md's failure
    /// handling), ai_rate_limited (retry shortly), not_found (wrong/foreign conversation id).</summary>
    [HttpPost("{id:guid}/messages")]
    [RequirePermission(Permissions.Ai.View)]
    public async Task<IActionResult> Ask(Guid id, AskAiRequest request, CancellationToken ct)
    {
        var result = await _conversationService.AskAsync(id, request, ct);
        if (result.Succeeded) return Ok(ApiResponse.Ok(result.Value));
        return result.ErrorCode switch
        {
            "not_found" => NotFound(new { title = result.Error, status = 404, code = result.ErrorCode }),
            "ai_provider_not_configured" => StatusCode(503, new { title = result.Error, status = 503, code = result.ErrorCode }),
            "ai_rate_limited" => StatusCode(429, new { title = result.Error, status = 429, code = result.ErrorCode }),
            _ => BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode }),
        };
    }
}
