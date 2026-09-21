using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Mall;

public enum TenantNoticeStatus
{
    Draft = 0,
    Sent = 1,
    Acknowledged = 2
}

/// <summary>A notice to a mall tenant (or facility-wide when RentalTenantId is null).</summary>
public class TenantNotice : TenantEntity
{
    public Guid FacilityId { get; set; }
    public Guid? RentalTenantId { get; set; }
    public string Subject { get; set; } = default!;
    public string Content { get; set; } = default!;
    public DateOnly NoticeDate { get; set; }
    public TenantNoticeStatus Status { get; set; } = TenantNoticeStatus.Draft;
}
