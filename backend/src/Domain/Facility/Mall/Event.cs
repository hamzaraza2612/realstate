using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Mall;

public enum FacilityEventStatus
{
    Planned = 0,
    Ongoing = 1,
    Completed = 2,
    Cancelled = 3
}

public class FacilityEvent : TenantEntity
{
    public Guid FacilityId { get; set; }
    public string Title { get; set; } = default!;
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string? Location { get; set; }
    public string? Organizer { get; set; }
    public FacilityEventStatus Status { get; set; } = FacilityEventStatus.Planned;
    public string? Notes { get; set; }
}
