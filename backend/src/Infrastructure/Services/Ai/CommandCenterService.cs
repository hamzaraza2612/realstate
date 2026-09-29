using RealEstateErp.Application.Ai;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// The Command Center landing page's single aggregator — deliberately thin: it only combines what
/// IBusinessHealthService/IAttentionEngineService/the conversation list already compute, never
/// recomputing business logic itself. See docs/AI_ARCHITECTURE.md.
/// </summary>
public class CommandCenterService : ICommandCenterService
{
    private readonly IBusinessHealthService _healthService;
    private readonly IAttentionEngineService _attentionEngine;
    private readonly IAiConversationService _conversationService;
    private readonly IAiProvider _aiProvider;

    public CommandCenterService(
        IBusinessHealthService healthService, IAttentionEngineService attentionEngine,
        IAiConversationService conversationService, IAiProvider aiProvider)
    {
        _healthService = healthService;
        _attentionEngine = attentionEngine;
        _conversationService = conversationService;
        _aiProvider = aiProvider;
    }

    public async Task<CommandCenterSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var health = await _healthService.GetAsync(ct);
        var attentionItems = await _attentionEngine.GetAsync(ct);
        var recentConversations = await _conversationService.ListMineAsync(new PagedRequest { Page = 1, PageSize = 5 }, ct);

        return new CommandCenterSummaryDto(health, attentionItems, recentConversations.Data, _aiProvider.IsConfigured);
    }
}
