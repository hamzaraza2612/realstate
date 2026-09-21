using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Mall;

public enum ParkingSpaceStatus
{
    Available = 0,
    Allocated = 1,
    Inactive = 2
}

/// <summary>A single physical parking spot in a mall facility — simpler than Space (no lease/rate
/// foundation of its own; the fee lives on the allocation), so it's its own lightweight entity rather than
/// overloading Space with parking-only fields.</summary>
public class ParkingSpace : TenantEntity
{
    public Guid FacilityId { get; set; }
    public string Code { get; set; } = default!;
    public ParkingSpaceStatus Status { get; set; } = ParkingSpaceStatus.Available;
}

public enum ParkingAllocationStatus
{
    Active = 0,
    Ended = 1
}

/// <summary>An assignment of a ParkingSpace to a tenant/vehicle, with a one-off or per-period fee — a
/// foundation, not a full recurring-billing engine (repeated fees are just repeated allocations or
/// repeated payments against the same allocation).</summary>
public class ParkingAllocation : TenantEntity
{
    public Guid ParkingSpaceId { get; set; }
    public Guid? RentalTenantId { get; set; }
    public string? VehicleReference { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public ParkingAllocationStatus Status { get; set; } = ParkingAllocationStatus.Active;
    public string? Notes { get; set; }
}
