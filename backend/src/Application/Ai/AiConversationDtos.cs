using FluentValidation;
using RealEstateErp.Domain.Ai;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Ai;

public record AiMessageDto(
    Guid Id, AiMessageRole Role, string Content, object? Facts, object? ToolCalls,
    string? Provider, string? Model, AiMessageStatus Status, string? ErrorMessage, DateTimeOffset CreatedAt);

public record AiConversationSummaryDto(Guid Id, string Title, AiConversationStatus Status, DateTimeOffset UpdatedAt, DateTimeOffset CreatedAt);

public record AiConversationDto(Guid Id, string Title, AiConversationStatus Status, IReadOnlyList<AiMessageDto> Messages, DateTimeOffset CreatedAt);

public record CreateAiConversationRequest(string? Title);

public record AskAiRequest(string Question);

/// <summary>
/// Orchestrates one "Ask Your Business" turn end to end: resolves the caller's available tools
/// (IAiToolRegistry, filtered by their actual permissions — never assumes a prior turn's
/// authorization still holds), builds a layered prompt (docs/AI_ARCHITECTURE.md), calls IAiProvider,
/// executes any READ tool calls immediately and turns any WRITE tool call into an AiActionProposal
/// instead of executing it, and persists both the user's question and the assistant's answer as
/// AiMessage rows. Every conversation is strictly scoped to the tenant+user that created it — see
/// AiConversationService for the isolation check on every method.
/// </summary>
public interface IAiConversationService
{
    Task<PagedResult<AiConversationSummaryDto>> ListMineAsync(PagedRequest request, CancellationToken ct = default);

    /// <summary>Result.Failure("not_found") if the conversation doesn't exist OR belongs to another
    /// tenant/user — the two cases are deliberately indistinguishable to the caller.</summary>
    Task<Result<AiConversationDto>> GetAsync(Guid id, CancellationToken ct = default);

    Task<Result<AiConversationDto>> CreateAsync(CreateAiConversationRequest request, CancellationToken ct = default);

    Task<Result<AiMessageDto>> AskAsync(Guid conversationId, AskAiRequest request, CancellationToken ct = default);
}

public class AskAiRequestValidator : AbstractValidator<AskAiRequest>
{
    public AskAiRequestValidator()
    {
        RuleFor(x => x.Question).NotEmpty().MaximumLength(2000);
    }
}
