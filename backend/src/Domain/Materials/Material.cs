using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Materials;

/// <summary>
/// A construction material/consumable catalog item. Deliberately a separate model from
/// Projects.InventoryUnit (a sellable plot/apartment) — this tracks stock of things consumed
/// while building, not real-estate assets sold to customers.
/// </summary>
public class Material : TenantEntity
{
    /// <summary>Unique within the tenant (e.g. "CEM-001").</summary>
    public string Sku { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string UnitOfMeasure { get; set; } = default!;
    public string? Category { get; set; }

    /// <summary>Running stock level, kept in sync by StockMovement rows — never edited directly.</summary>
    public decimal CurrentQuantity { get; set; }

    public decimal MinimumQuantity { get; set; }
    public bool IsActive { get; set; } = true;
}
