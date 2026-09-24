using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.Units;

public record PropertyUnitDto(
    Guid Id,
    Guid PropertyId,
    string PropertyName,
    string? BuildingBlock,
    string UnitNumber,
    PropertyUnitType Type,
    string? Floor,
    decimal? AreaSize,
    string? AreaUnit,
    int? Bedrooms,
    PropertyUnitStatus Status,
    decimal? MarketRentRate,
    string? MetadataJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreatePropertyUnitRequest(
    Guid PropertyId,
    string? BuildingBlock,
    string UnitNumber,
    PropertyUnitType Type,
    string? Floor,
    decimal? AreaSize,
    string? AreaUnit,
    int? Bedrooms,
    decimal? MarketRentRate,
    string? MetadataJson);

public record UpdatePropertyUnitRequest(
    string? BuildingBlock,
    string UnitNumber,
    PropertyUnitType Type,
    string? Floor,
    decimal? AreaSize,
    string? AreaUnit,
    int? Bedrooms,
    decimal? MarketRentRate,
    string? MetadataJson);

public record ChangePropertyUnitStatusRequest(PropertyUnitStatus Status);

public record PropertyUnitFilter(Guid? PropertyId, PropertyUnitType? Type, PropertyUnitStatus? Status, string? Search);
