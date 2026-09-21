using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

public enum PropertyType
{
    Building = 0,
    ApartmentComplex = 1,
    CommercialProperty = 2,
    OfficeBuilding = 3,
    ShoppingProperty = 4,
    House = 5,
    Other = 6
}

public enum PropertyStatus
{
    Active = 0,
    Inactive = 1,
    UnderRenovation = 2
}

/// <summary>A rentable real-estate asset (a building, complex, or standalone property). Separate from
/// Projects.Project, which models a development/sales project, not an operating rental asset.</summary>
public class Property : TenantEntity
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public PropertyType Type { get; set; }
    public PropertyStatus Status { get; set; } = PropertyStatus.Active;
    public string? Description { get; set; }

    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }

    /// <summary>Generic owner-information foundation — not a full ownership/title module yet.</summary>
    public string? OwnerName { get; set; }
    public string? OwnerContact { get; set; }
}
