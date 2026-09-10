using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Tenancy;

public enum TenantStatus
{
    Trial = 0,
    Active = 1,
    Suspended = 2,
    Cancelled = 3
}

/// <summary>A tenant is a customer organization (real-estate company, developer, property manager, etc.) on the platform.</summary>
public class Tenant : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public TenantStatus Status { get; set; } = TenantStatus.Trial;
    public string Timezone { get; set; } = "UTC";
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public Guid? SubscriptionPlanId { get; set; }
    public DateTimeOffset? TrialEndsAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
