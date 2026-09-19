using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Application.Projects.Projects;

public record ProjectDto(
    Guid Id,
    string Name,
    string Code,
    ProjectType Type,
    ProjectStatus Status,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    int NodeCount,
    int InventoryCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateProjectRequest(
    string Name,
    string Code,
    ProjectType Type,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson);

public record UpdateProjectRequest(
    string Name,
    ProjectStatus Status,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson);

public record ProjectFilter(ProjectType? Type, ProjectStatus? Status, string? Search);
