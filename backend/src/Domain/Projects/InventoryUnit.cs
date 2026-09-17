using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Projects;

public enum InventoryUnitType
{
    Plot = 0,
    Apartment = 1,
    Office = 2,
    Shop = 3,
    House = 4,
    CommercialUnit = 5,
    Other = 6
}

public enum InventoryAreaUnit
{
    SqFt = 0,
    SqYd = 1,
    SqM = 2,
    Marla = 3,
    Kanal = 4,
    Acre = 5
}

/// <summary>
/// Lifecycle of a sellable unit. Kept intentionally generic — future Sales Booking/Construction/
/// Property modules drive transitions through these states rather than owning their own status enum.
/// </summary>
public enum InventoryStatus
{
    Available = 0,
    Reserved = 1,
    Booked = 2,
    Sold = 3,
    Blocked = 4,
    UnderConstruction = 5,
    HandedOver = 6
}

/// <summary>
/// A single sellable/leasable unit (plot, apartment, office, shop, house, ...). Always belongs to a
/// Project and optionally sits under one hierarchy node (a floor, block, phase, etc.); a project with
/// no hierarchy (e.g. a flat list of plots) can leave <see cref="NodeId"/> null.
/// </summary>
public class InventoryUnit : TenantEntity
{
    public Guid ProjectId { get; set; }
    public Guid? NodeId { get; set; }

    /// <summary>Unique within the project (e.g. "A-101", "PLOT-42").</summary>
    public string Code { get; set; } = default!;

    public InventoryUnitType Type { get; set; }
    public InventoryStatus Status { get; set; } = InventoryStatus.Available;

    public decimal? AreaSize { get; set; }
    public InventoryAreaUnit? AreaUnit { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? GeoJson { get; set; }

    /// <summary>Free-form JSON for type-specific attributes (bedrooms, facing, etc.) without new columns per unit type.</summary>
    public string? MetadataJson { get; set; }
}
