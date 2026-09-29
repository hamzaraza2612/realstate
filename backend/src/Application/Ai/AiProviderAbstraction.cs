using System.Text.Json;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Ai;

/// <summary>
/// A provider-agnostic content block — the smallest shared shape every major provider's tool-calling
/// protocol can map to/from (plain text, a request to invoke a tool, and a tool's result). Business
/// logic (IAiConversationService) is written entirely against these types, never against a specific
/// provider SDK's request/response classes, so swapping IAiProvider implementations never touches
/// orchestration code. See docs/AI_ARCHITECTURE.md.
/// </summary>
public abstract record AiContentBlock;
public record AiTextContent(string Text) : AiContentBlock;
public record AiToolUseContent(string Id, string Name, JsonElement Input) : AiContentBlock;
public record AiToolResultContent(string ToolUseId, string Content, bool IsError) : AiContentBlock;

/// <summary>Role is "user" or "assistant" only — a provider-agnostic conversation turn. The system
/// prompt is passed separately (AiCompletionRequest.System), not as a turn, matching how every
/// current major provider's API actually shapes a request.</summary>
public record AiMessageTurn(string Role, IReadOnlyList<AiContentBlock> Content);

public record AiToolSpec(string Name, string Description, JsonElement InputSchema);

public record AiCompletionRequest(
    string? System,
    IReadOnlyList<AiMessageTurn> Turns,
    IReadOnlyList<AiToolSpec> Tools,
    int MaxTokens);

/// <summary>StopReason is one of "end_turn" (final answer, no more tool calls), "tool_use" (the
/// caller must execute the tool calls in Content and send another request with their results), or
/// "other" (max tokens reached, a refusal, or anything else that ends the turn without either of the
/// above) — a small, deliberately provider-neutral vocabulary, not a raw passthrough of e.g.
/// Anthropic's own stop_reason strings.</summary>
public record AiCompletionResult(
    IReadOnlyList<AiContentBlock> Content,
    string StopReason,
    string Model,
    int InputTokens,
    int OutputTokens);

/// <summary>
/// The seam between the ERP's AI orchestration and a specific AI vendor. Exactly one real
/// implementation is expected in production at a time (configured via the "Ai" settings section);
/// UnconfiguredAiProvider is the safe default when none is configured, so the rest of the app never
/// has a null-provider special case to handle. Never throws for an ordinary provider failure (rate
/// limit, timeout, malformed upstream response) — those come back as Result.Failure with a stable
/// error code so callers can react without a try/catch around vendor-specific exception types.
/// </summary>
public interface IAiProvider
{
    string ProviderName { get; }
    bool IsConfigured { get; }
    Task<Result<AiCompletionResult>> CompleteAsync(AiCompletionRequest request, CancellationToken ct = default);
}
