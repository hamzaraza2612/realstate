using RealEstateErp.Domain.Procurement;

namespace RealEstateErp.Application.Procurement.PurchaseOrders;

public record PurchaseOrderLineDto(
    Guid Id,
    Guid? MaterialId,
    string ItemDescription,
    string UnitOfMeasure,
    decimal Quantity,
    decimal UnitPrice,
    decimal Total,
    decimal ReceivedQuantity,
    decimal OutstandingQuantity);

public record PurchaseOrderDto(
    Guid Id,
    string PoNumber,
    Guid VendorId,
    string VendorName,
    Guid ProjectId,
    string ProjectName,
    Guid? WorkPackageId,
    string? WorkPackageName,
    Guid? PurchaseRequestId,
    string? PurchaseRequestNumber,
    DateOnly OrderDate,
    DateOnly? ExpectedDeliveryDate,
    PurchaseOrderStatus Status,
    decimal Subtotal,
    decimal Discount,
    decimal TaxAmount,
    decimal Total,
    string? Notes,
    IReadOnlyList<PurchaseOrderLineDto> Lines,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreatePurchaseOrderLineRequest(Guid? MaterialId, string ItemDescription, string UnitOfMeasure, decimal Quantity, decimal UnitPrice);

public record CreatePurchaseOrderRequest(
    Guid VendorId,
    Guid ProjectId,
    Guid? WorkPackageId,
    Guid? PurchaseRequestId,
    DateOnly OrderDate,
    DateOnly? ExpectedDeliveryDate,
    decimal Discount,
    decimal TaxAmount,
    string? Notes,
    IReadOnlyList<CreatePurchaseOrderLineRequest> Lines);

public record UpdatePurchaseOrderRequest(
    DateOnly OrderDate,
    DateOnly? ExpectedDeliveryDate,
    decimal Discount,
    decimal TaxAmount,
    string? Notes,
    IReadOnlyList<CreatePurchaseOrderLineRequest> Lines);

public record PurchaseOrderFilter(Guid? ProjectId, Guid? VendorId, PurchaseOrderStatus? Status, string? Search);
