using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Billing;

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    Paid = 2,
    Void = 3,
    Overdue = 4
}

/// <summary>A billing record for one subscription period. Not coupled to any payment gateway — see
/// IBillingPaymentProvider for the future-provider extension seam. InvoiceNumber is tenant-scoped
/// (unique per (TenantId, InvoiceNumber), not globally unique), following this codebase's existing
/// convention for tenant-owned business identifiers (BookingNumber, LeaseNumber, etc.).</summary>
public class Invoice : TenantEntity
{
    public Guid SubscriptionId { get; set; }
    public string InvoiceNumber { get; set; } = default!;

    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }

    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "USD";

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateOnly IssuedDate { get; set; }
    public DateOnly DueDate { get; set; }
    public DateOnly? PaidDate { get; set; }

    /// <summary>Nullable extension field for a future payment provider's own invoice/reference id.</summary>
    public string? ExternalProviderReference { get; set; }

    public ICollection<InvoiceLineItem> LineItems { get; set; } = new List<InvoiceLineItem>();
}

public class InvoiceLineItem : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public string Description { get; set; } = default!;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}
