namespace RealEstateErp.Application.Ai;

/// <summary>The Command Center's single landing-page payload — Business Health + top attention items
/// + recent conversations, so the frontend can render the whole initial view with one call. Recent
/// AI-proposed actions are fetched separately (GET /api/v1/ai/action-proposals) since they have their
/// own pagination/filtering needs.</summary>
public record CommandCenterSummaryDto(
    BusinessHealthDto Health,
    IReadOnlyList<AttentionItemDto> AttentionItems,
    IReadOnlyList<AiConversationSummaryDto> RecentConversations,
    bool AiProviderConfigured);

public interface ICommandCenterService
{
    Task<CommandCenterSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}
