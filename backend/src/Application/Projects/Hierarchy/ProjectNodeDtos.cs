using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Application.Projects.Hierarchy;

public record ProjectNodeDto(
    Guid Id,
    Guid ProjectId,
    Guid? ParentNodeId,
    ProjectNodeType NodeType,
    string Name,
    string Code,
    int SortOrder,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson,
    int ChildNodeCount,
    int InventoryCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateProjectNodeRequest(
    Guid ProjectId,
    Guid? ParentNodeId,
    ProjectNodeType NodeType,
    string Name,
    string Code,
    int SortOrder,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson);

public record UpdateProjectNodeRequest(
    string Name,
    string Code,
    int SortOrder,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson);
