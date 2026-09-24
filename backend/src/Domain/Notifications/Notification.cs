using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Notifications;

/// <summary>What kind of event produced a notification — drives both the message template and which
/// per-category preference (NotificationPreference) governs whether it's actually delivered.</summary>
public enum NotificationCategory
{
    General = 0,
    ApprovalRequested = 1,
    ApprovalDecided = 2,
    DocumentUploaded = 3,
    Other = 4
}

/// <summary>An in-app notification for one user. EntityType/EntityId (optional) drive a deep link back
/// to whatever produced the notification (an ApprovalRequest, a Document, etc.) without this table
/// needing an FK to every possible source table — same polymorphic-reference pattern as Document.</summary>
public class Notification : TenantEntity
{
    public Guid UserId { get; set; }
    public NotificationCategory Category { get; set; }
    public string Title { get; set; } = default!;
    public string Body { get; set; } = default!;
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}

/// <summary>Per-user, per-category opt-in/out for each delivery channel. Missing row for a
/// (user, category) pair means both channels default to enabled.</summary>
public class NotificationPreference : TenantEntity
{
    public Guid UserId { get; set; }
    public NotificationCategory Category { get; set; }
    public bool InAppEnabled { get; set; } = true;
    public bool EmailEnabled { get; set; } = true;
}
