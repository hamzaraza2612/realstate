using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility;

public enum SpaceType
{
    Shop = 0,
    Office = 1,
    CoworkingArea = 2,
    ParkingArea = 3,
    CommonArea = 4,
    Other = 5
}

/// <summary>Deliberately a distinct type from Property.PropertyUnitStatus and Projects.InventoryUnitStatus
/// — the three occupancy models are never conflated.</summary>
public enum SpaceStatus
{
    Available = 0,
    Reserved = 1,
    Occupied = 2,
    Maintenance = 3,
    Inactive = 4
}

/// <summary>A generic rentable/usable area within a Facility (a mall shop, a coworking floor, a parking
/// zone, a common area). When a space is actually leased under the existing Sales/Property leasing model
/// (typically a mall shop), it links to the real PropertyUnit that Lease.UnitId already points at via
/// PropertyUnitId — this is the reuse bridge to Property.PropertyUnit rather than a duplicate unit model.
/// PropertyUnitId is null for spaces with no formal lease (a coworking desk zone, a parking area).</summary>
public class Space : TenantEntity
{
    public Guid FacilityId { get; set; }
    public Guid? PropertyUnitId { get; set; }

    public string? BuildingBlock { get; set; }
    public string Code { get; set; } = default!;
    public SpaceType Type { get; set; }
    public decimal? AreaSize { get; set; }
    public int? Capacity { get; set; }
    public SpaceStatus Status { get; set; } = SpaceStatus.Available;
    public decimal? Rate { get; set; }
    public string? MetadataJson { get; set; }
}

/// <summary>Mirrors Property.PropertyUnitStatusRules — Occupied is only ever entered/exited by the owning
/// workflow (a mall lease activation, a coworking desk assignment), never a direct manual transition.</summary>
public static class SpaceStatusRules
{
    private static readonly Dictionary<SpaceStatus, SpaceStatus[]> Allowed = new()
    {
        [SpaceStatus.Available] = new[] { SpaceStatus.Reserved, SpaceStatus.Occupied, SpaceStatus.Maintenance, SpaceStatus.Inactive },
        [SpaceStatus.Reserved] = new[] { SpaceStatus.Available, SpaceStatus.Occupied, SpaceStatus.Maintenance, SpaceStatus.Inactive },
        [SpaceStatus.Occupied] = new[] { SpaceStatus.Available, SpaceStatus.Maintenance },
        [SpaceStatus.Maintenance] = new[] { SpaceStatus.Available, SpaceStatus.Inactive },
        [SpaceStatus.Inactive] = new[] { SpaceStatus.Available },
    };

    public static bool CanTransition(SpaceStatus from, SpaceStatus to) =>
        from == to || (Allowed.TryGetValue(from, out var next) && next.Contains(to));
}
