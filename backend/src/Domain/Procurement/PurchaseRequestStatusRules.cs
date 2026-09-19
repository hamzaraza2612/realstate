namespace RealEstateErp.Domain.Procurement;

/// <summary>Valid purchase-request transitions: Draft → Submitted → Approved/Rejected, with Cancelled reachable from Draft/Submitted.</summary>
public static class PurchaseRequestStatusRules
{
    private static readonly Dictionary<PurchaseRequestStatus, PurchaseRequestStatus[]> Allowed = new()
    {
        [PurchaseRequestStatus.Draft] = new[] { PurchaseRequestStatus.Submitted, PurchaseRequestStatus.Cancelled },
        [PurchaseRequestStatus.Submitted] = new[] { PurchaseRequestStatus.Approved, PurchaseRequestStatus.Rejected, PurchaseRequestStatus.Cancelled },
        [PurchaseRequestStatus.Approved] = Array.Empty<PurchaseRequestStatus>(),
        [PurchaseRequestStatus.Rejected] = Array.Empty<PurchaseRequestStatus>(),
        [PurchaseRequestStatus.Cancelled] = Array.Empty<PurchaseRequestStatus>(),
    };

    public static bool CanTransition(PurchaseRequestStatus from, PurchaseRequestStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
