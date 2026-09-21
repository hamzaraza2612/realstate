using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

public enum SecurityDepositStatus
{
    Pending = 0,
    Held = 1,
    PartiallyRefunded = 2,
    Refunded = 3,
    Forfeited = 4
}

/// <summary>Security deposit foundation for a Lease — one deposit record per lease, created
/// automatically at lease creation when Lease.SecurityDeposit > 0. No legal/tax rules yet: refund and
/// forfeiture are plain amount adjustments with no interest/escrow accounting.</summary>
public class SecurityDeposit : TenantEntity
{
    public Guid LeaseId { get; set; }

    public decimal Amount { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public SecurityDepositStatus Status { get; set; } = SecurityDepositStatus.Pending;
    public decimal RefundedAmount { get; set; }
    public DateOnly? RefundDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Valid security-deposit transitions: Pending -> Held (received) -> Refunded/PartiallyRefunded/Forfeited (terminal).</summary>
public static class SecurityDepositStatusRules
{
    private static readonly Dictionary<SecurityDepositStatus, SecurityDepositStatus[]> Allowed = new()
    {
        [SecurityDepositStatus.Pending] = new[] { SecurityDepositStatus.Held },
        [SecurityDepositStatus.Held] = new[] { SecurityDepositStatus.PartiallyRefunded, SecurityDepositStatus.Refunded, SecurityDepositStatus.Forfeited },
        [SecurityDepositStatus.PartiallyRefunded] = new[] { SecurityDepositStatus.Refunded, SecurityDepositStatus.Forfeited },
        [SecurityDepositStatus.Refunded] = Array.Empty<SecurityDepositStatus>(),
        [SecurityDepositStatus.Forfeited] = Array.Empty<SecurityDepositStatus>(),
    };

    public static bool CanTransition(SecurityDepositStatus from, SecurityDepositStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
