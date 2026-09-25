using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Billing;

public enum BillingPaymentStatus
{
    Pending = 0,
    Succeeded = 1,
    Failed = 2,
    Refunded = 3
}

/// <summary>A recorded payment against an Invoice. Named BillingPayment (not Payment) to stay
/// unambiguous alongside Sales' Payment, Property's RentPayment, and Facility's FacilityPayment —
/// the same per-module payment-naming convention already used three times in this codebase. This
/// milestone only supports recording a payment that was already received (e.g. by a platform admin
/// after a bank transfer) — see IBillingPaymentProvider for the seam a future real gateway plugs
/// into; no card data of any kind is ever persisted here.</summary>
public class BillingPayment : TenantEntity
{
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public BillingPaymentStatus Status { get; set; } = BillingPaymentStatus.Pending;
    public DateOnly PaymentDate { get; set; }

    /// <summary>"manual" for a platform-admin-recorded payment (the only path this milestone
    /// implements); a real gateway integration would populate this with its own provider name.</summary>
    public string Provider { get; set; } = "manual";
    public string? ProviderTransactionId { get; set; }

    /// <summary>Unique per (TenantId, IdempotencyKey) — same pattern as Sales Payment/Property
    /// RentPayment/Facility FacilityPayment, so a retried "record payment" request never double-posts.</summary>
    public string IdempotencyKey { get; set; } = default!;

    public string? FailureReason { get; set; }
}
