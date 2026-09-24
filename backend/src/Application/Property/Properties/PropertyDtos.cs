using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.Properties;

public record PropertyDto(
    Guid Id,
    string Code,
    string Name,
    PropertyType Type,
    PropertyStatus Status,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? OwnerName,
    string? OwnerContact,
    int UnitCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreatePropertyRequest(
    string Code,
    string Name,
    PropertyType Type,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? OwnerName,
    string? OwnerContact);

public record UpdatePropertyRequest(
    string Name,
    PropertyStatus Status,
    string? Description,
    string? AddressLine,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? OwnerName,
    string? OwnerContact);

public record PropertyFilter(PropertyType? Type, PropertyStatus? Status, string? Search);
