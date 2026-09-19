namespace RealEstateErp.Application.Procurement.Receiving;

public record MaterialReceiptLineDto(Guid Id, Guid PurchaseOrderLineId, string ItemDescription, decimal ReceivedQuantity);

public record MaterialReceiptDto(
    Guid Id,
    string ReceiptNumber,
    Guid PurchaseOrderId,
    string PoNumber,
    Guid VendorId,
    string VendorName,
    DateOnly ReceivedDate,
    Guid ReceivedByUserId,
    string? ReceivedByUserName,
    string? Notes,
    IReadOnlyList<MaterialReceiptLineDto> Lines,
    DateTimeOffset CreatedAt);

public record CreateMaterialReceiptLineRequest(Guid PurchaseOrderLineId, decimal ReceivedQuantity);

public record CreateMaterialReceiptRequest(DateOnly ReceivedDate, string? Notes, IReadOnlyList<CreateMaterialReceiptLineRequest> Lines);
