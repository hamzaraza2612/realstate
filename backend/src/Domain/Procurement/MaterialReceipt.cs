using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Procurement;

/// <summary>Goods received against a PurchaseOrder, possibly partial. Each line's quantity is validated against the PO line's remaining (ordered − already received) quantity — see PurchaseOrderLine.ReceivedQuantity.</summary>
public class MaterialReceipt : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "GRN-000001").</summary>
    public string ReceiptNumber { get; set; } = default!;

    public Guid PurchaseOrderId { get; set; }
    public Guid VendorId { get; set; }
    public DateOnly ReceivedDate { get; set; }
    public Guid ReceivedByUserId { get; set; }
    public string? Notes { get; set; }
}

public class MaterialReceiptLine : TenantEntity
{
    public Guid MaterialReceiptId { get; set; }
    public Guid PurchaseOrderLineId { get; set; }
    public decimal ReceivedQuantity { get; set; }
}
