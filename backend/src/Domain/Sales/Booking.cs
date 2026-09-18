using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Sales;

public enum BookingStatus
{
    Draft = 0,
    PendingApproval = 1,
    Confirmed = 2,
    Cancelled = 3
}

/// <summary>
/// Links a Customer to a specific Inventory Unit within a Project. One booking owns exactly one
/// payment plan (see <see cref="PaymentPlan"/>). A database-level partial unique index on
/// <see cref="InventoryUnitId"/> (active statuses only) is the actual guard against double-booking —
/// this entity does not attempt to re-implement that with in-process locking.
/// </summary>
public class Booking : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "BK-000001").</summary>
    public string BookingNumber { get; set; } = default!;

    public Guid CustomerId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid InventoryUnitId { get; set; }

    /// <summary>Owning agent. No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid SalesAgentUserId { get; set; }

    public DateOnly BookingDate { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Draft;

    public decimal TotalPrice { get; set; }
    public decimal Discount { get; set; }

    /// <summary>TotalPrice - Discount, computed server-side at creation — never accepted directly from a request.</summary>
    public decimal NetPrice { get; set; }

    public string? Notes { get; set; }
}
