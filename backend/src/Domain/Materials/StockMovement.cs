using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Materials;

public enum StockMovementType
{
    Receipt = 0,
    Issue = 1,
    Adjustment = 2
}

/// <summary>
/// One change to a Material's stock level. Quantity is signed (positive = increase, negative =
/// decrease) regardless of Type, so applying it to Material.CurrentQuantity is always a simple sum —
/// Type exists for reporting/filtering, not to infer direction.
/// </summary>
public class StockMovement : TenantEntity
{
    public Guid MaterialId { get; set; }
    public StockMovementType Type { get; set; }
    public decimal Quantity { get; set; }

    /// <summary>What produced this movement, e.g. "MaterialReceipt" + the receipt's Id. Null for manual issue/adjustment entries.</summary>
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }

    public string? Notes { get; set; }
}
