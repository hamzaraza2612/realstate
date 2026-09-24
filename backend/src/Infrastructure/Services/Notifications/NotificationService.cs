using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Notifications;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public NotificationService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<PagedResult<NotificationDto>> ListAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var query = _db.Notifications.Where(n => n.UserId == userId);

        if (filter.UnreadOnly == true) query = query.Where(n => !n.IsRead);
        if (filter.Category.HasValue) query = query.Where(n => n.Category == filter.Category);

        var total = await query.CountAsync(ct);
        var notifications = await query.OrderByDescending(n => n.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<NotificationDto>(notifications.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<int> GetUnreadCountAsync(CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        return await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);
    }

    public async Task<Result<NotificationDto>> MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, ct);
        if (notification is null) return Result.Failure<NotificationDto>("Notification not found.", "not_found");

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return Result.Success(ToDto(notification));
    }

    public async Task MarkAllReadAsync(CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        foreach (var notification in unread)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }
        if (unread.Count > 0) await _db.SaveChangesAsync(ct);
    }

    public async Task<Notification> CreateAsync(Guid userId, NotificationCategory category, string title, string body,
        string? entityType, Guid? entityId, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = userId,
            Category = category,
            Title = title,
            Body = body,
            EntityType = entityType,
            EntityId = entityId
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);
        return notification;
    }

    private static NotificationDto ToDto(Notification n) => new(
        n.Id, n.Category, n.Title, n.Body, n.EntityType, n.EntityId, n.IsRead, n.ReadAt, n.CreatedAt);
}
