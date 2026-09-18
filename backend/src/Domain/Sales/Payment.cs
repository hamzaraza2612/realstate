using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Sales;

public enum PaymentMethod
{
    Cash = 0,
    BankTransfer = 1,
    Cheque = 2,
    CreditCard = 3,
    Online = 4,
    Other = 5
}

/// <summary>
/// A recorded payment against one installment. Each payment posts exactly one journal entry to the
/// Finance module (see ISalesPaymentPostingService) in the same transaction it's recorded in.
/// </summary>
public class Payment : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "RCPT-000001").</summary>
    public string ReceiptNumber { get; set; } = default!;

    public Guid BookingId { get; set; }
    public Guid InstallmentId { get; set; }

    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public PaymentMethod Method { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid RecordedByUserId { get; set; }

    /// <summary>Optional caller-supplied key (e.g. from a retried HTTP request) so replaying the same request returns the original payment instead of recording it twice.</summary>
    public string? IdempotencyKey { get; set; }
}
