using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Projects;

public enum ProjectType
{
    Society = 0,
    Building = 1,
    TownPlanning = 2,
    ConstructionProject = 3,
    CommercialProperty = 4,
    Other = 5
}

public enum ProjectStatus
{
    Planning = 0,
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

/// <summary>
/// Top-level real-estate development: a society, a single building, a commercial plaza, etc.
/// Everything else in this module (hierarchy nodes, inventory units) hangs off a Project.
/// </summary>
public class Project : TenantEntity
{
    public string Name { get; set; } = default!;

    /// <summary>Short, tenant-unique key used in inventory codes and references (e.g. "GHS", "SKY-TWR").</summary>
    public string Code { get; set; } = default!;

    public ProjectType Type { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
    public string? Description { get; set; }

    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>Map anchor point for the project as a whole.</summary>
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    /// <summary>Optional GeoJSON geometry (e.g. a boundary polygon) for map rendering.</summary>
    public string? GeoJson { get; set; }
}
