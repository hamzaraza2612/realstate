using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Projects;

/// <summary>
/// The kind of level a hierarchy node represents. Deliberately flat (no enforced ordering) so a
/// Society can go Phase → Block → Plot while a single Building can go straight to Floor → Unit,
/// without the model forcing unused levels on either project type.
/// </summary>
public enum ProjectNodeType
{
    Phase = 0,
    Zone = 1,
    Block = 2,
    Building = 3,
    Floor = 4
}

/// <summary>
/// One node in a project's hierarchy tree (phase, zone, block, building, or floor). Self-referencing
/// so a project can nest levels arbitrarily deep or skip levels it doesn't need; inventory units attach
/// to whichever node they actually sit under (or directly to the project when there's no hierarchy at all).
/// </summary>
public class ProjectNode : TenantEntity
{
    public Guid ProjectId { get; set; }
    public Guid? ParentNodeId { get; set; }
    public ProjectNodeType NodeType { get; set; }

    public string Name { get; set; } = default!;

    /// <summary>Short label unique within the project (e.g. "P1", "BLK-A", "F3").</summary>
    public string Code { get; set; } = default!;

    public int SortOrder { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? GeoJson { get; set; }

    /// <summary>Free-form JSON for level-specific attributes (e.g. floor count, block area) without new columns per project type.</summary>
    public string? MetadataJson { get; set; }
}
