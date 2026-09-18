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
/// A recorded payment against one installment. Deliberately simple — this is the recording
/// foundation for sales collections, not a ledger; a future accounting/GL milestone can post
/// against these rows without needing to change their shape (booking/installment linkage,
/// amount, method, reference already match what a journal entry would need).
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
}
