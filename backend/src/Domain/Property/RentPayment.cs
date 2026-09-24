using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

/// <summary>A recorded payment against one rent schedule line. Each payment posts exactly one journal
/// entry to the Finance module (see IRentalPaymentPostingService) in the same transaction it's recorded
/// in — mirrors Sales.Payment's integration pattern exactly. Reuses Sales.PaymentMethod rather than
/// duplicating that enum.</summary>
public class RentPayment : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "RNT-000001").</summary>
    public string ReceiptNumber { get; set; } = default!;

    public Guid LeaseId { get; set; }
    public Guid RentScheduleId { get; set; }

    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public Sales.PaymentMethod Method { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    /// <summary>No navigation property — AppUser lives in Infrastructure (Identity).</summary>
    public Guid RecordedByUserId { get; set; }

    /// <summary>Optional caller-supplied key so replaying the same request returns the original payment instead of recording it twice.</summary>
    public string? IdempotencyKey { get; set; }
}
