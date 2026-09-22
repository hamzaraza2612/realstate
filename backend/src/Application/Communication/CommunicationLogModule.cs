using RealEstateErp.Domain.Communication;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Communication;

public record CommunicationLogDto(
    Guid Id,
    CommunicationChannel Channel,
    Guid? RecipientUserId,
    string? RecipientAddress,
    string Subject,
    CommunicationStatus Status,
    string? ErrorMessage,
    string? EntityType,
    Guid? EntityId,
    DateTimeOffset CreatedAt);

public record CommunicationLogFilter(Guid? RecipientUserId, string? EntityType, Guid? EntityId, CommunicationStatus? Status);

/// <summary>Read-only view over the communication history every ICommunicationService.SendAsync call
/// writes — support/diagnostic visibility into what was actually sent, skipped (preference-disabled or
/// unimplemented channel), or failed, and why.</summary>
public interface ICommunicationLogQueryService
{
    Task<PagedResult<CommunicationLogDto>> ListAsync(PagedRequest request, CommunicationLogFilter filter, CancellationToken ct = default);
}
