using RealEstateErp.Domain.Procurement;

namespace RealEstateErp.Application.Procurement.PurchaseRequests;

public record PurchaseRequestLineDto(
    Guid Id,
    Guid? MaterialId,
    string ItemDescription,
    string UnitOfMeasure,
    decimal Quantity,
    decimal EstimatedUnitPrice,
    decimal EstimatedTotal);

public record PurchaseRequestDto(
    Guid Id,
    string RequestNumber,
    Guid ProjectId,
    string ProjectName,
    Guid? WorkPackageId,
    string? WorkPackageName,
    Guid RequestedByUserId,
    string? RequestedByUserName,
    DateOnly? RequiredDate,
    PurchasePriority Priority,
    PurchaseRequestStatus Status,
    string? Notes,
    decimal EstimatedTotal,
    IReadOnlyList<PurchaseRequestLineDto> Lines,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreatePurchaseRequestLineRequest(Guid? MaterialId, string ItemDescription, string UnitOfMeasure, decimal Quantity, decimal EstimatedUnitPrice);

public record CreatePurchaseRequestRequest(
    Guid ProjectId,
    Guid? WorkPackageId,
    DateOnly? RequiredDate,
    PurchasePriority Priority,
    string? Notes,
    IReadOnlyList<CreatePurchaseRequestLineRequest> Lines);

public record UpdatePurchaseRequestRequest(
    DateOnly? RequiredDate,
    PurchasePriority Priority,
    string? Notes,
    IReadOnlyList<CreatePurchaseRequestLineRequest> Lines);

public record PurchaseRequestFilter(Guid? ProjectId, PurchaseRequestStatus? Status, string? Search);
