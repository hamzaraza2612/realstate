using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Crm;

public enum ActivityType
{
    Call = 0,
    Meeting = 1,
    Note = 2,
    FollowUp = 3
}

public enum ActivityStatus
{
    Pending = 0,
    Completed = 1
}

/// <summary>A logged interaction (call/meeting/note) or scheduled follow-up against a lead and/or customer.</summary>
public class Activity : TenantEntity
{
    public ActivityType Type { get; set; }
    public string Subject { get; set; } = default!;
    public string? Description { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public ActivityStatus Status { get; set; } = ActivityStatus.Pending;
    public DateTimeOffset? CompletedAt { get; set; }

    public Guid? LeadId { get; set; }
    public Guid? CustomerId { get; set; }

    /// <summary>Agent/user this activity is logged against. No navigation — AppUser lives in Infrastructure.</summary>
    public Guid? AssignedToUserId { get; set; }
}
