using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Procurement;

public enum PurchaseRequestStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    Cancelled = 4
}

public enum PurchasePriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

/// <summary>An internal request to buy materials/services for a project — the origin of a PurchaseOrder, once approved.</summary>
public class PurchaseRequest : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "PR-000001").</summary>
    public string RequestNumber { get; set; } = default!;

    public Guid ProjectId { get; set; }
    public Guid? WorkPackageId { get; set; }
    public Guid RequestedByUserId { get; set; }

    public DateOnly? RequiredDate { get; set; }
    public PurchasePriority Priority { get; set; } = PurchasePriority.Medium;
    public PurchaseRequestStatus Status { get; set; } = PurchaseRequestStatus.Draft;
    public string? Notes { get; set; }
}

public class PurchaseRequestLine : TenantEntity
{
    public Guid PurchaseRequestId { get; set; }
    public Guid? MaterialId { get; set; }
    public string ItemDescription { get; set; } = default!;
    public string UnitOfMeasure { get; set; } = default!;
    public decimal Quantity { get; set; }
    public decimal EstimatedUnitPrice { get; set; }
    public decimal EstimatedTotal { get; set; }
}
