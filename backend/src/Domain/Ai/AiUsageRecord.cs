using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Ai;

/// <summary>
/// One AI provider call's usage — the basis for both cost visibility and tenant-aware rate limiting
/// (IAiRateLimiter counts recent rows for a tenant rather than maintaining separate in-memory state,
/// so limits are correct across multiple API instances). Deliberately does not store prompt/response
/// text — see AiMessage for the conversational record; this is usage/billing metadata only.
/// </summary>
public class AiUsageRecord : TenantEntity
{
    public Guid UserId { get; set; }
    public Guid? ConversationId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public string Provider { get; set; } = default!;
    public string? Model { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public bool Succeeded { get; set; }
    public string? ErrorCode { get; set; }
}
