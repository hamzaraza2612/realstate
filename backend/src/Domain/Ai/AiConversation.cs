using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Ai;

public enum AiConversationStatus
{
    Active = 0,
    Archived = 1
}

public enum AiMessageRole
{
    User = 0,
    Assistant = 1,
    System = 2,

    /// <summary>Never persisted as its own row this milestone — tool results are folded into the
    /// Assistant message's FactsJson/ToolCallsJson instead of a separate Tool-role row, since nothing
    /// yet needs to replay the raw tool-result turns back to a provider across sessions. Reserved for
    /// a future milestone that needs full provider-turn replay.</summary>
    Tool = 3
}

public enum AiMessageStatus
{
    Completed = 0,
    Failed = 1
}

/// <summary>
/// A persisted AI chat conversation — tenant- and user-scoped. A user can only ever see/continue
/// their own conversations (see AiConversationService); this milestone deliberately does not support
/// sharing a conversation with another user (per the M16 spec's "unless explicitly supported later").
/// </summary>
public class AiConversation : TenantEntity
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = default!;
    public AiConversationStatus Status { get; set; } = AiConversationStatus.Active;

    public ICollection<AiMessage> Messages { get; set; } = new List<AiMessage>();
}

/// <summary>
/// One turn in an AiConversation. Content is the plain-text message shown to the user (the user's
/// question, or the assistant's final answer) — never the raw provider request/response payload,
/// per the M16 spec's "do not store unnecessary sensitive provider payloads" instruction.
///
/// FactsJson holds the structured, tool-sourced data behind an assistant answer — populated directly
/// from IAiTool execution results, never parsed out of the model's own prose — so the frontend can
/// render authoritative figures independent of whatever the model's text says (see
/// docs/AI_ARCHITECTURE.md's hallucination-defense section). ToolCallsJson records which tools were
/// invoked and with what (sanitized) arguments, for audit/debugging — never raw secrets.
/// </summary>
public class AiMessage : TenantEntity
{
    public Guid ConversationId { get; set; }
    public AiConversation? Conversation { get; set; }

    public AiMessageRole Role { get; set; }
    public string Content { get; set; } = default!;

    public string? FactsJson { get; set; }
    public string? ToolCallsJson { get; set; }

    public string? Provider { get; set; }
    public string? Model { get; set; }
    public int? InputTokens { get; set; }
    public int? OutputTokens { get; set; }

    public AiMessageStatus Status { get; set; } = AiMessageStatus.Completed;
    public string? ErrorMessage { get; set; }
}
