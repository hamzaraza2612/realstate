using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

public enum PropertyUnitType
{
    Apartment = 0,
    Office = 1,
    Shop = 2,
    House = 3,
    Commercial = 4,
    Other = 5
}

/// <summary>Rental occupancy state — deliberately a distinct type from Projects.InventoryUnitStatus
/// (sales inventory) so rental occupancy and sales-unit status are never conflated.</summary>
public enum PropertyUnitStatus
{
    Available = 0,
    Reserved = 1,
    Occupied = 2,
    Maintenance = 3,
    Inactive = 4
}

/// <summary>A rentable unit within a Property. Separate from Projects.InventoryUnit (sales inventory) —
/// the two are never mixed.</summary>
public class PropertyUnit : TenantEntity
{
    public Guid PropertyId { get; set; }

    /// <summary>Free-text building/block reference where the property has internal sub-structure (e.g. "Block A", "Tower 2"). No separate hierarchy table for this foundation milestone.</summary>
    public string? BuildingBlock { get; set; }

    public string UnitNumber { get; set; } = default!;
    public PropertyUnitType Type { get; set; }
    public string? Floor { get; set; }
    public decimal? AreaSize { get; set; }
    public string? AreaUnit { get; set; }
    public int? Bedrooms { get; set; }
    public PropertyUnitStatus Status { get; set; } = PropertyUnitStatus.Available;
    public decimal? MarketRentRate { get; set; }
    public string? MetadataJson { get; set; }
}

/// <summary>Valid rental-occupancy transitions. Occupied is only ever entered/exited by Lease activation/
/// termination (see LeaseService), never a direct manual transition.</summary>
public static class PropertyUnitStatusRules
{
    private static readonly Dictionary<PropertyUnitStatus, PropertyUnitStatus[]> Allowed = new()
    {
        [PropertyUnitStatus.Available] = new[] { PropertyUnitStatus.Reserved, PropertyUnitStatus.Occupied, PropertyUnitStatus.Maintenance, PropertyUnitStatus.Inactive },
        [PropertyUnitStatus.Reserved] = new[] { PropertyUnitStatus.Available, PropertyUnitStatus.Occupied, PropertyUnitStatus.Maintenance, PropertyUnitStatus.Inactive },
        [PropertyUnitStatus.Occupied] = new[] { PropertyUnitStatus.Available, PropertyUnitStatus.Maintenance },
        [PropertyUnitStatus.Maintenance] = new[] { PropertyUnitStatus.Available, PropertyUnitStatus.Inactive },
        [PropertyUnitStatus.Inactive] = new[] { PropertyUnitStatus.Available },
    };

    public static bool CanTransition(PropertyUnitStatus from, PropertyUnitStatus to) =>
        from == to || (Allowed.TryGetValue(from, out var next) && next.Contains(to));
}
