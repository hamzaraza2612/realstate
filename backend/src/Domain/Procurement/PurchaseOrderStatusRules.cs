namespace RealEstateErp.Domain.Procurement;

/// <summary>
/// Valid PO transitions. PartiallyReceived/Received are never set by a manual action — the receiving
/// service derives them from line quantities and applies the transition through this same table.
/// </summary>
public static class PurchaseOrderStatusRules
{
    private static readonly Dictionary<PurchaseOrderStatus, PurchaseOrderStatus[]> Allowed = new()
    {
        [PurchaseOrderStatus.Draft] = new[] { PurchaseOrderStatus.PendingApproval, PurchaseOrderStatus.Cancelled },
        [PurchaseOrderStatus.PendingApproval] = new[] { PurchaseOrderStatus.Approved, PurchaseOrderStatus.Draft, PurchaseOrderStatus.Cancelled },
        [PurchaseOrderStatus.Approved] = new[] { PurchaseOrderStatus.Sent, PurchaseOrderStatus.Cancelled },
        [PurchaseOrderStatus.Sent] = new[] { PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled },
        [PurchaseOrderStatus.PartiallyReceived] = new[] { PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled },
        [PurchaseOrderStatus.Received] = Array.Empty<PurchaseOrderStatus>(),
        [PurchaseOrderStatus.Cancelled] = Array.Empty<PurchaseOrderStatus>(),
    };

    public static bool CanTransition(PurchaseOrderStatus from, PurchaseOrderStatus to) =>
        from == to || (Allowed.TryGetValue(from, out var next) && next.Contains(to));
}
