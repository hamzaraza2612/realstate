using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Procurement;

public enum PurchaseOrderStatus
{
    Draft = 0,
    PendingApproval = 1,
    Approved = 2,
    Sent = 3,
    PartiallyReceived = 4,
    Received = 5,
    Cancelled = 6
}

/// <summary>An order placed with a Vendor, optionally traceable back to the PurchaseRequest that originated it. Totals are always computed server-side from lines — never accepted from a request.</summary>
public class PurchaseOrder : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "PO-000001").</summary>
    public string PoNumber { get; set; } = default!;

    public Guid VendorId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? WorkPackageId { get; set; }
    public Guid? PurchaseRequestId { get; set; }

    public DateOnly OrderDate { get; set; }
    public DateOnly? ExpectedDeliveryDate { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;

    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }

    public string? Notes { get; set; }
}

public class PurchaseOrderLine : TenantEntity
{
    public Guid PurchaseOrderId { get; set; }
    public Guid? MaterialId { get; set; }
    public string ItemDescription { get; set; } = default!;
    public string UnitOfMeasure { get; set; } = default!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }

    /// <summary>Running total received across all receipt lines against this PO line — never allowed to exceed Quantity.</summary>
    public decimal ReceivedQuantity { get; set; }
}
