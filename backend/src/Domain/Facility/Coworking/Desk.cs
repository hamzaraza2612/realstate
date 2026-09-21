using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

public enum DeskType
{
    Hot = 0,
    Dedicated = 1
}

public enum DeskStatus
{
    Available = 0,
    Occupied = 1,
    Maintenance = 2,
    Inactive = 3
}

/// <summary>A bookable desk within a coworking Space.</summary>
public class Desk : TenantEntity
{
    public Guid SpaceId { get; set; }
    public string Code { get; set; } = default!;
    public DeskType Type { get; set; }
    public DeskStatus Status { get; set; } = DeskStatus.Available;
}
