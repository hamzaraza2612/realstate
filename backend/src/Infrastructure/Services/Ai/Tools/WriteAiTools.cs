using System.Text.Json;
using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Infrastructure.Services.Ai.Tools;

/// <summary>
/// The one WRITE tool this milestone ships — a deliberately low-risk mutation (a CRM follow-up
/// activity: no money, no external communication, no destructive/irreversible effect) chosen to
/// prove the full propose -> approve -> execute pipeline end to end without taking on the review
/// burden of a higher-risk action. Never invoked directly from a conversation turn — AiConversationService
/// always routes a WRITE tool call through AiActionProposal instead of calling ExecuteAsync itself;
/// this class's ExecuteAsync is only ever called by AiActionProposalService.ExecuteInternalAsync
/// after the linked ApprovalRequest is approved. See docs/AI_ARCHITECTURE.md.
/// </summary>
public class CreateFollowUpTool : IAiTool
{
    private readonly IActivityService _activityService;
    public CreateFollowUpTool(IActivityService activityService) { _activityService = activityService; }

    public string Name => "crm.create_follow_up";
    public string Description =>
        "Propose creating a follow-up activity (a call, meeting, or task) for a lead or customer. This is a WRITE action: it requires explicit approval before it takes effect.";
    public AiToolAccess Access => AiToolAccess.Write;
    public string? RequiredPermission => Permissions.Crm.ActivityManage;

    public JsonElement InputSchema => AiJsonSchema.Object(
        new AiJsonSchema.Prop("leadId", "string", "The lead id to follow up on (either leadId or customerId is required)."),
        new AiJsonSchema.Prop("customerId", "string", "The customer id to follow up on (either leadId or customerId is required)."),
        new AiJsonSchema.Prop("subject", "string", "A short subject line for the follow-up.", Required: true),
        new AiJsonSchema.Prop("description", "string", "Optional additional detail."),
        new AiJsonSchema.Prop("dueDate", "string", "Optional due date/time (ISO 8601)."));

    public async Task<Result<object>> ExecuteAsync(AiToolContext context, JsonElement arguments, CancellationToken ct = default)
    {
        var leadId = arguments.TryGetGuid("leadId");
        var customerId = arguments.TryGetGuid("customerId");
        var subject = arguments.TryGetString("subject");
        if (string.IsNullOrWhiteSpace(subject)) return Result.Failure<object>("A subject is required.", "invalid_arguments");
        if (leadId is null && customerId is null) return Result.Failure<object>("Either leadId or customerId is required.", "invalid_arguments");

        DateTimeOffset? dueDate = null;
        var dueDateRaw = arguments.TryGetString("dueDate");
        if (!string.IsNullOrWhiteSpace(dueDateRaw) && DateTimeOffset.TryParse(dueDateRaw, out var parsed)) dueDate = parsed;

        var request = new CreateActivityRequest(
            ActivityType.FollowUp, subject, arguments.TryGetString("description"), dueDate, leadId, customerId, null);
        var result = await _activityService.CreateAsync(request, ct);
        return result.Succeeded
            ? Result.Success<object>(result.Value!)
            : Result.Failure<object>(result.Error!, result.ErrorCode!);
    }
}
