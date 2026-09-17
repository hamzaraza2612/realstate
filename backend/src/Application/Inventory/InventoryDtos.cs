using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Application.Inventory;

public record InventoryUnitDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? NodeId,
    string? NodePath,
    string Code,
    InventoryUnitType Type,
    InventoryStatus Status,
    decimal? AreaSize,
    InventoryAreaUnit? AreaUnit,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateInventoryUnitRequest(
    Guid ProjectId,
    Guid? NodeId,
    string Code,
    InventoryUnitType Type,
    decimal? AreaSize,
    InventoryAreaUnit? AreaUnit,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson);

public record UpdateInventoryUnitRequest(
    Guid? NodeId,
    string Code,
    InventoryUnitType Type,
    decimal? AreaSize,
    InventoryAreaUnit? AreaUnit,
    decimal? Latitude,
    decimal? Longitude,
    string? GeoJson,
    string? MetadataJson);

public record ChangeInventoryStatusRequest(InventoryStatus Status);

public record InventoryFilter(
    Guid? ProjectId,
    Guid? NodeId,
    InventoryUnitType? Type,
    InventoryStatus? Status,
    decimal? MinArea,
    decimal? MaxArea,
    string? Search);
