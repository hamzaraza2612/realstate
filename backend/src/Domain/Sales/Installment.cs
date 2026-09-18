using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Sales;

/// <summary>
/// Persisted states. "Overdue" is deliberately not one of the values a service ever assigns —
/// it's computed at read time from DueDate + GracePeriodDays vs. today, so nothing needs a
/// scheduled job to keep it in sync. It exists as an enum member purely so DTOs can report it.
/// </summary>
public enum InstallmentStatus
{
    Pending = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
}

/// <summary>One due amount within a booking's payment plan (booking amount, down payment, or a periodic installment).</summary>
public class Installment : TenantEntity
{
    public Guid BookingId { get; set; }
    public Guid PaymentPlanId { get; set; }

    public int InstallmentNumber { get; set; }
    public string Label { get; set; } = default!;
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public InstallmentStatus Status { get; set; } = InstallmentStatus.Pending;
    public DateOnly? PaymentDate { get; set; }
    public string? Notes { get; set; }
}
