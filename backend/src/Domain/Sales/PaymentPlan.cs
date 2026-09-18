using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Sales;

public enum PaymentPlanType
{
    Percentage = 0,
    FixedAmount = 1
}

public enum InstallmentFrequency
{
    Monthly = 0,
    Quarterly = 1,
    SemiAnnually = 2,
    Annually = 3
}

/// <summary>
/// One payment plan per booking (enforced by a unique index on BookingId). Splits the booking's net
/// price into an upfront booking amount, a down payment, and a series of periodic installments —
/// the actual due dates/amounts live on the generated <see cref="Installment"/> rows, not here.
/// </summary>
public class PaymentPlan : TenantEntity
{
    public Guid BookingId { get; set; }
    public string Name { get; set; } = default!;

    public decimal BookingAmount { get; set; }
    public decimal DownPayment { get; set; }

    public PaymentPlanType PlanType { get; set; }
    public InstallmentFrequency Frequency { get; set; }
    public int NumberOfInstallments { get; set; }
    public int GracePeriodDays { get; set; }
}
