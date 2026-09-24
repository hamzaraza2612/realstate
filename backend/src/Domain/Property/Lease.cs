using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

public enum LeaseStatus
{
    Draft = 0,
    PendingApproval = 1,
    Active = 2,
    Expired = 3,
    Terminated = 4,
    Cancelled = 5
}

/// <summary>Foundation for configurable payment frequency — Monthly is the only one Rent Schedule
/// generation currently paces installments on evenly; Quarterly/Yearly are accepted and stored but
/// generate one schedule line per period rather than a monthly-normalized breakdown.</summary>
public enum LeasePaymentFrequency
{
    Monthly = 0,
    Quarterly = 1,
    Yearly = 2
}

/// <summary>A tenancy agreement for one PropertyUnit. Rent Schedule lines are generated from this when
/// the lease becomes Active (see LeaseService), not persisted ahead of time.</summary>
public class Lease : TenantEntity
{
    public string LeaseNumber { get; set; } = default!;
    public Guid PropertyId { get; set; }
    public Guid UnitId { get; set; }

    /// <summary>FK to RentalTenant — named RentalTenantId (not TenantId) to avoid colliding with the inherited SaaS-tenant TenantEntity.TenantId.</summary>
    public Guid RentalTenantId { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal RentAmount { get; set; }
    public decimal SecurityDeposit { get; set; }
    public LeasePaymentFrequency PaymentFrequency { get; set; } = LeasePaymentFrequency.Monthly;
    public int GracePeriodDays { get; set; }
    public LeaseStatus Status { get; set; } = LeaseStatus.Draft;
    public string? Terms { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Valid lease status transitions: Draft -> PendingApproval -> Active -> Expired/Terminated;
/// Cancelled reachable only before the lease ever becomes Active (a live tenancy is ended via
/// Terminated, not Cancelled).</summary>
public static class LeaseStatusRules
{
    private static readonly Dictionary<LeaseStatus, LeaseStatus[]> Allowed = new()
    {
        [LeaseStatus.Draft] = new[] { LeaseStatus.PendingApproval, LeaseStatus.Cancelled },
        [LeaseStatus.PendingApproval] = new[] { LeaseStatus.Active, LeaseStatus.Cancelled },
        [LeaseStatus.Active] = new[] { LeaseStatus.Expired, LeaseStatus.Terminated },
        [LeaseStatus.Expired] = Array.Empty<LeaseStatus>(),
        [LeaseStatus.Terminated] = Array.Empty<LeaseStatus>(),
        [LeaseStatus.Cancelled] = Array.Empty<LeaseStatus>(),
    };

    public static bool CanTransition(LeaseStatus from, LeaseStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);

    /// <summary>Non-terminal statuses that block another lease from being created/activated on the same unit.</summary>
    public static bool IsConflicting(LeaseStatus status) => status is LeaseStatus.Draft or LeaseStatus.PendingApproval or LeaseStatus.Active;
}
