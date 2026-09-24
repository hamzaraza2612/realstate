using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance;

/// <summary>
/// The Facility Management -> Finance integration seam, shared by every facility billing subtype
/// (service charges, parking, coworking memberships/bookings, utilities) rather than one posting service
/// per subtype. Adds the journal entry to the ambient DbContext's change tracker — it deliberately does
/// not call SaveChanges itself, so the caller (FacilityPaymentService) persists the payment and its
/// financial posting in one transaction. Accounting mapping: Dr Cash and Bank, Cr Facility Revenue, for
/// the payment amount (cash-basis recognition on receipt — the same convention as Sales/Rental posting).
/// <paramref name="referenceType"/> distinguishes the billing subtype for traceability/duplicate-posting
/// protection (e.g. "FacilityServiceCharge", "FacilityParking") and reuses the existing
/// (TenantId, ReferenceType, ReferenceId) unique index on journal_entries from Milestone 5 — no new
/// constraint needed.
/// </summary>
public interface IFacilityFinancePostingService
{
    Task<Result> PostFacilityRevenueAsync(
        Guid paymentId, decimal amount, DateOnly paymentDate, string referenceType, string? referenceNumber, CancellationToken ct = default);
}
