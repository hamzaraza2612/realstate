using RealEstateErp.Domain.Notifications;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Notifications;

public record NotificationDto(
    Guid Id,
    NotificationCategory Category,
    string Title,
    string Body,
    string? EntityType,
    Guid? EntityId,
    bool IsRead,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt);

public record NotificationFilter(bool? UnreadOnly, NotificationCategory? Category);

public record NotificationPreferenceDto(NotificationCategory Category, bool InAppEnabled, bool EmailEnabled);

public record UpdateNotificationPreferenceRequest(NotificationCategory Category, bool InAppEnabled, bool EmailEnabled);

public interface INotificationService
{
    Task<PagedResult<NotificationDto>> ListAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllReadAsync(CancellationToken ct = default);

    /// <summary>Internal creation entry point other modules call (via ICommunicationService, not
    /// directly) — not exposed over HTTP, since a notification's recipient/content is always
    /// system-determined, never client-supplied.</summary>
    Task<Notification> CreateAsync(Guid userId, NotificationCategory category, string title, string body, string? entityType, Guid? entityId, CancellationToken ct = default);
}

public interface INotificationPreferenceService
{
    Task<IReadOnlyList<NotificationPreferenceDto>> GetMineAsync(CancellationToken ct = default);
    Task<NotificationPreferenceDto> UpdateMineAsync(UpdateNotificationPreferenceRequest request, CancellationToken ct = default);

    /// <summary>Used internally by ICommunicationService to decide whether a channel is enabled for a
    /// given user/category — defaults to true (enabled) when no preference row exists yet.</summary>
    Task<(bool InAppEnabled, bool EmailEnabled)> GetEffectiveAsync(Guid userId, NotificationCategory category, CancellationToken ct = default);
}
