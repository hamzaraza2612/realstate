using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility;

/// <summary>Which chargeable record a FacilityPayment is settling. Keeping one generic payment ledger
/// across every facility billing subtype (service charges, parking, coworking memberships/bookings,
/// utilities) avoids five near-duplicate payment entities — each source row just needs Amount/PaidAmount/
/// a status, and this table is the single place all of them get paid from and traced to Finance.</summary>
public enum FacilityPaymentSourceType
{
    ServiceCharge = 0,
    Parking = 1,
    CoworkingMembership = 2,
    CoworkingBooking = 3,
    Utility = 4
}

/// <summary>A recorded payment against one chargeable facility record. Posts exactly one journal entry to
/// Finance (see IFacilityFinancePostingService) in the same transaction it's recorded in — mirrors
/// Sales.Payment/Property.RentPayment's integration pattern exactly. Reuses Sales.PaymentMethod.</summary>
public class FacilityPayment : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "FAC-000001").</summary>
    public string ReceiptNumber { get; set; } = default!;

    public FacilityPaymentSourceType SourceType { get; set; }
    public Guid SourceId { get; set; }

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
