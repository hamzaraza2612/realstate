using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Coworking;

public enum MembershipStatus
{
    Active = 0,
    Expired = 1,
    Cancelled = 2
}

/// <summary>A member's subscription to a MembershipPlan for one period. Amount/PaidAmount are billed
/// directly on this row (no separate payment-status sub-entity, unlike Lease's SecurityDeposit — a
/// membership's money and its lifecycle status are simple enough to share one row).</summary>
public class Membership : TenantEntity
{
    public Guid MemberId { get; set; }
    public Guid PlanId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public MembershipStatus Status { get; set; } = MembershipStatus.Active;
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
}

/// <summary>Active -> Expired/Cancelled, both terminal — a membership is never reactivated in place, a new one is created instead.</summary>
public static class MembershipStatusRules
{
    private static readonly Dictionary<MembershipStatus, MembershipStatus[]> Allowed = new()
    {
        [MembershipStatus.Active] = new[] { MembershipStatus.Expired, MembershipStatus.Cancelled },
        [MembershipStatus.Expired] = Array.Empty<MembershipStatus>(),
        [MembershipStatus.Cancelled] = Array.Empty<MembershipStatus>(),
    };

    public static bool CanTransition(MembershipStatus from, MembershipStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
