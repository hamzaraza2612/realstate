using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

/// <summary>Persisted states. "Overdue" is deliberately never assigned by a service — like
/// Sales.InstallmentStatus, it's computed at read time from DueDate + Lease.GracePeriodDays vs. today,
/// so nothing needs a scheduled job to keep it in sync.</summary>
public enum RentScheduleStatus
{
    Pending = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
}

/// <summary>One due rent obligation for a period of a Lease. Deliberately its own model rather than
/// reusing Sales.Installment — a rent schedule line is generated per period from a Lease's
/// start/end/frequency, not from a hand-configured payment plan, and belongs to a Lease rather than a
/// Booking.</summary>
public class RentSchedule : TenantEntity
{
    public Guid LeaseId { get; set; }

    public int PeriodNumber { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public RentScheduleStatus Status { get; set; } = RentScheduleStatus.Pending;
}
