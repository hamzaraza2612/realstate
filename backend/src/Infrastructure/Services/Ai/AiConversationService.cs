using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Ai;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// Orchestrates one "Ask Your Business" turn end to end — see docs/AI_ARCHITECTURE.md's
/// prompt/context-architecture and tool-authorization sections for the full design. Every method
/// re-derives the caller's tenant/user from ITenantContext and re-checks conversation ownership;
/// nothing here trusts a client-supplied id without that check.
/// </summary>
public class AiConversationService : IAiConversationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAiProvider _aiProvider;
    private readonly IAiToolRegistry _toolRegistry;
    private readonly IAiRateLimiter _rateLimiter;
    private readonly IAiActionProposalService _actionProposalService;
    private readonly IAuditLogger _auditLogger;
    private readonly AiSettings _settings;

    public AiConversationService(
        AppDbContext db, ITenantContext tenantContext, IAiProvider aiProvider, IAiToolRegistry toolRegistry,
        IAiRateLimiter rateLimiter, IAiActionProposalService actionProposalService, IAuditLogger auditLogger,
        IOptions<AiSettings> settings)
    {
        _db = db;
        _tenantContext = tenantContext;
        _aiProvider = aiProvider;
        _toolRegistry = toolRegistry;
        _rateLimiter = rateLimiter;
        _actionProposalService = actionProposalService;
        _auditLogger = auditLogger;
        _settings = settings.Value;
    }

    public async Task<PagedResult<AiConversationSummaryDto>> ListMineAsync(PagedRequest request, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var query = _db.AiConversations.Where(c => c.UserId == userId);
        var total = await query.CountAsync(ct);
        var items = await query
            .Select(c => new { c, LastMessageAt = c.Messages.Max(m => (DateTimeOffset?)m.CreatedAt) })
            .OrderByDescending(x => x.LastMessageAt ?? x.c.CreatedAt)
            .Skip(request.Skip).Take(request.PageSize)
            .ToListAsync(ct);

        var dtos = items.Select(x => new AiConversationSummaryDto(
            x.c.Id, x.c.Title, x.c.Status, x.LastMessageAt ?? x.c.CreatedAt, x.c.CreatedAt)).ToList();
        return new PagedResult<AiConversationSummaryDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<AiConversationDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var conversation = await _db.AiConversations.Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
        // The ambient tenant query filter already excludes other tenants' rows entirely; the
        // explicit UserId check above is what additionally prevents one user from reading another
        // user's conversation within the SAME tenant — the two "not found" cases are deliberately
        // indistinguishable to the caller.
        if (conversation is null) return Result.Failure<AiConversationDto>("Conversation not found.", "not_found");
        return Result.Success(ToDto(conversation));
    }

    public async Task<Result<AiConversationDto>> CreateAsync(CreateAiConversationRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId || _tenantContext.UserId is not { } userId)
            return Result.Failure<AiConversationDto>("No tenant/user context.", "no_context");

        var conversation = new AiConversation
        {
            TenantId = tenantId,
            UserId = userId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "New conversation" : request.Title!.Trim(),
        };
        _db.AiConversations.Add(conversation);
        await _db.SaveChangesAsync(ct);

        return Result.Success(ToDto(conversation));
    }

    public async Task<Result<AiMessageDto>> AskAsync(Guid conversationId, AskAiRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId || _tenantContext.UserId is not { } userId)
            return Result.Failure<AiMessageDto>("No tenant/user context.", "no_context");

        var conversation = await _db.AiConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId, ct);
        if (conversation is null) return Result.Failure<AiMessageDto>("Conversation not found.", "not_found");

        if (!_aiProvider.IsConfigured)
            return Result.Failure<AiMessageDto>("AI is not configured for this deployment.", "ai_provider_not_configured");

        if (!await _rateLimiter.TryAcquireAsync(tenantId, ct))
            return Result.Failure<AiMessageDto>("AI usage rate limit reached for this organization. Please try again shortly.", "ai_rate_limited");

        _db.AiMessages.Add(new AiMessage
        {
            TenantId = tenantId, ConversationId = conversationId, Role = AiMessageRole.User,
            Content = request.Question, Status = AiMessageStatus.Completed,
        });
        await _db.SaveChangesAsync(ct);

        var permissions = await GetPermissionsAsync(userId, ct);
        var availableTools = _toolRegistry.GetAvailableTools(permissions);
        var toolSpecs = availableTools.Select(t => new AiToolSpec(t.Name, t.Description, t.InputSchema)).ToList();

        var history = await _db.AiMessages
            .Where(m => m.ConversationId == conversationId && (m.Role == AiMessageRole.User || m.Role == AiMessageRole.Assistant))
            .OrderByDescending(m => m.CreatedAt).Take(20).ToListAsync(ct);
        history.Reverse();

        var turns = history.Select(m => new AiMessageTurn(
            m.Role == AiMessageRole.User ? "user" : "assistant",
            (IReadOnlyList<AiContentBlock>)new List<AiContentBlock> { new AiTextContent(m.Content) })).ToList();

        var systemPrompt = await BuildSystemPromptAsync(tenantId, availableTools, ct);

        var facts = new List<object>();
        var toolCallsLog = new List<object>();
        var totalInputTokens = 0;
        var totalOutputTokens = 0;
        string? finalText = null;
        string? lastModel = null;
        var failed = false;
        string? failureError = null;
        string? failureCode = null;

        for (var iteration = 0; iteration < _settings.MaxToolIterations; iteration++)
        {
            var completionResult = await _aiProvider.CompleteAsync(
                new AiCompletionRequest(systemPrompt, turns, toolSpecs, _settings.MaxOutputTokens), ct);

            if (!completionResult.Succeeded)
            {
                failed = true;
                failureError = completionResult.Error;
                failureCode = completionResult.ErrorCode;
                break;
            }

            var completion = completionResult.Value!;
            totalInputTokens += completion.InputTokens;
            totalOutputTokens += completion.OutputTokens;
            lastModel = completion.Model;

            var textBlocks = completion.Content.OfType<AiTextContent>().ToList();
            if (textBlocks.Count > 0) finalText = string.Join("\n", textBlocks.Select(t => t.Text));

            var toolUses = completion.Content.OfType<AiToolUseContent>().ToList();
            if (completion.StopReason != "tool_use" || toolUses.Count == 0) break;

            turns.Add(new AiMessageTurn("assistant", completion.Content));

            var toolResults = new List<AiContentBlock>();
            foreach (var toolUse in toolUses)
            {
                var (resultText, isError) = await InvokeToolAsync(toolUse, tenantId, userId, permissions, conversationId, facts, toolCallsLog, ct);
                toolResults.Add(new AiToolResultContent(toolUse.Id, resultText, isError));
            }
            turns.Add(new AiMessageTurn("user", toolResults));
        }

        _db.AiUsageRecords.Add(new AiUsageRecord
        {
            TenantId = tenantId, UserId = userId, ConversationId = conversationId, OccurredAt = DateTimeOffset.UtcNow,
            Provider = _aiProvider.ProviderName, Model = lastModel, InputTokens = totalInputTokens, OutputTokens = totalOutputTokens,
            Succeeded = !failed, ErrorCode = failureCode,
        });

        var assistantMessage = new AiMessage
        {
            TenantId = tenantId,
            ConversationId = conversationId,
            Role = AiMessageRole.Assistant,
            Content = failed ? (failureError ?? "The AI could not complete this request.") : (finalText ?? "I don't have an answer for that."),
            FactsJson = facts.Count > 0 ? JsonSerializer.Serialize(facts) : null,
            ToolCallsJson = toolCallsLog.Count > 0 ? JsonSerializer.Serialize(toolCallsLog) : null,
            Provider = _aiProvider.ProviderName,
            Model = lastModel,
            InputTokens = totalInputTokens,
            OutputTokens = totalOutputTokens,
            Status = failed ? AiMessageStatus.Failed : AiMessageStatus.Completed,
            ErrorMessage = failed ? failureCode : null,
        };
        _db.AiMessages.Add(assistantMessage);
        await _db.SaveChangesAsync(ct);

        // The question text itself may reference customer/tenant names, so it's logged truncated,
        // never the full facts/answer payload — see docs/AI_ARCHITECTURE.md's privacy section.
        await _auditLogger.LogAsync("Ask", "Ai", "AiConversation", conversationId.ToString(),
            after: new
            {
                Question = Truncate(request.Question, 200),
                ToolsInvoked = toolCallsLog.Count,
                Status = failed ? "Failed" : "Completed",
            }, ct: ct);

        return failed
            ? Result.Failure<AiMessageDto>(failureError!, failureCode!)
            : Result.Success(ToDto(assistantMessage));
    }

    private async Task<(string ResultText, bool IsError)> InvokeToolAsync(
        AiToolUseContent toolUse, Guid tenantId, Guid userId, IReadOnlySet<string> permissions, Guid conversationId,
        List<object> facts, List<object> toolCallsLog, CancellationToken ct)
    {
        var tool = _toolRegistry.Find(toolUse.Name);

        // Re-checked here, not just trusted from GetAvailableTools' earlier filtering — a
        // long-running conversation must never rely on a permission snapshot taken turns ago.
        if (tool is null || (tool.RequiredPermission is not null && !permissions.Contains(tool.RequiredPermission)))
        {
            return ("This tool is not available or you are not authorized to use it.", true);
        }

        if (tool.Access == AiToolAccess.Write)
        {
            var proposal = await _actionProposalService.CreateAsync(
                conversationId, tool.Name, JsonSerializer.Serialize(toolUse.Input),
                $"The AI proposes to use '{tool.Name}': {tool.Description}", "This will create a new record. No existing data is modified or deleted.",
                "low", null, null, ct);

            toolCallsLog.Add(new { tool = tool.Name, access = "write", proposalId = proposal.Value?.Id });

            return proposal.Succeeded
                ? ($"This is a write action and requires approval before it takes effect. A proposal (id={proposal.Value!.Id}) has been created and is pending approval — it has NOT been executed.", false)
                : ($"Could not create an action proposal: {proposal.Error}", true);
        }

        var context = new AiToolContext(tenantId, userId, permissions);
        var execResult = await tool.ExecuteAsync(context, toolUse.Input, ct);
        toolCallsLog.Add(new { tool = tool.Name, access = "read", succeeded = execResult.Succeeded });

        if (!execResult.Succeeded) return ($"Error retrieving data: {execResult.Error}", true);

        facts.Add(new { tool = tool.Name, data = execResult.Value });
        return (JsonSerializer.Serialize(execResult.Value), false);
    }

    private async Task<string> BuildSystemPromptAsync(Guid tenantId, IReadOnlyList<IAiTool> availableTools, CancellationToken ct)
    {
        var tenant = await _db.Tenants.IgnoreQueryFilters().Where(t => t.Id == tenantId)
            .Select(t => new { t.Name, t.Currency }).FirstOrDefaultAsync(ct);

        // Layered per docs/AI_ARCHITECTURE.md: business rules, then tenant context, then the
        // available-tools list (already permission-filtered) — deliberately NOT the entire ERP
        // schema or database records; those only enter the conversation as tool results, on demand.
        return $"""
            You are the Business Command Center assistant for a real-estate ERP. You help management
            understand what is happening in their business, why, and what to do next.

            Rules:
            - You may only state facts and figures that came from a tool result in this conversation.
              Never invent, estimate, or "round" a number that a tool did not return.
            - Structure your answer with three sections when analysis is warranted: FACTS (verbatim
              from tool results, with numbers), ANALYSIS (what the facts suggest, clearly labeled as
              interpretation), and RECOMMENDATION (a specific, actionable next step).
            - If you need business data to answer, call the appropriate tool rather than guessing.
            - Tools marked as write actions never execute immediately — using one only creates a
              pending proposal that a human must approve. Tell the user this plainly.
            - If no tool can supply the information requested, say so rather than guessing.
            - Be concise. This is a business tool, not a general-purpose chat assistant.

            Organization: {tenant?.Name ?? "this organization"} (reporting currency: {tenant?.Currency ?? "USD"}).

            Available tools: {string.Join(", ", availableTools.Select(t => t.Name))}.
            """;
    }

    private async Task<HashSet<string>> GetPermissionsAsync(Guid userId, CancellationToken ct)
    {
        var roleIds = await _db.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync(ct);
        return (await _db.RolePermissions.Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission!.Code).Distinct().ToListAsync(ct)).ToHashSet();
    }

    private static string Truncate(string value, int maxLength) => value.Length <= maxLength ? value : value[..maxLength] + "...";

    private static AiConversationDto ToDto(AiConversation conversation) => new(
        conversation.Id, conversation.Title, conversation.Status,
        conversation.Messages.OrderBy(m => m.CreatedAt).Select(ToDto).ToList(), conversation.CreatedAt);

    private static AiMessageDto ToDto(AiMessage m) => new(
        m.Id, m.Role, m.Content,
        m.FactsJson is null ? null : JsonSerializer.Deserialize<object>(m.FactsJson),
        m.ToolCallsJson is null ? null : JsonSerializer.Deserialize<object>(m.ToolCallsJson),
        m.Provider, m.Model, m.Status, m.ErrorMessage, m.CreatedAt);
}
