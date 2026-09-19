using RealEstateErp.Domain.Materials;

namespace RealEstateErp.Application.Materials;

public record MaterialDto(
    Guid Id,
    string Sku,
    string Name,
    string UnitOfMeasure,
    string? Category,
    decimal CurrentQuantity,
    decimal MinimumQuantity,
    bool IsActive,
    bool IsBelowMinimum,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateMaterialRequest(string Sku, string Name, string UnitOfMeasure, string? Category, decimal MinimumQuantity);

public record UpdateMaterialRequest(string Name, string? Category, decimal MinimumQuantity, bool IsActive);

public record MaterialFilter(bool? IsActive, bool? BelowMinimumOnly, string? Search);

public record StockMovementDto(
    Guid Id,
    Guid MaterialId,
    StockMovementType Type,
    decimal Quantity,
    string? ReferenceType,
    Guid? ReferenceId,
    string? Notes,
    DateTimeOffset CreatedAt);

public record CreateStockMovementRequest(StockMovementType Type, decimal Quantity, string? Notes);
