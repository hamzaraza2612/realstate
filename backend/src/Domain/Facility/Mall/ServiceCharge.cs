using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility.Mall;

public enum ServiceChargeCalculationType
{
    FixedAmount = 0,
    PerAreaUnit = 1
}

/// <summary>A billable service-charge definition for a mall facility (common-area maintenance, security,
/// etc.). Reuses Property.LeasePaymentFrequency rather than a duplicate frequency enum.</summary>
public class ServiceChargeDefinition : TenantEntity
{
    public Guid FacilityId { get; set; }
    public string Name { get; set; } = default!;
    public ServiceChargeCalculationType CalculationType { get; set; }
    /// <summary>A flat amount when CalculationType is FixedAmount, or a rate per unit of leased area when PerAreaUnit.</summary>
    public decimal Amount { get; set; }
    public Property.LeasePaymentFrequency BillingFrequency { get; set; } = Property.LeasePaymentFrequency.Monthly;
    public bool IsActive { get; set; } = true;
}

public enum ServiceChargeStatus
{
    Pending = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Cancelled = 3
}

/// <summary>One generated, billable instance of a ServiceChargeDefinition against a specific Lease for a
/// specific period — the tenant-allocation/billing foundation. Amount is always computed deterministically
/// from the definition (see FacilityBillingService), never entered by hand.</summary>
public class ServiceChargeCharge : TenantEntity
{
    public Guid ServiceChargeDefinitionId { get; set; }
    public Guid LeaseId { get; set; }

    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public ServiceChargeStatus Status { get; set; } = ServiceChargeStatus.Pending;
}
