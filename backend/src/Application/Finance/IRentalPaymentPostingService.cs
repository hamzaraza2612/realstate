using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance;

/// <summary>
/// The Property/Rental -> Finance integration seam. Adds the journal entry for a rent payment to the
/// ambient DbContext's change tracker — it deliberately does not call SaveChanges itself, so the caller
/// (Property's RentPaymentService) persists the payment and its financial posting in one transaction.
/// Accounting mapping: Dr Cash and Bank, Cr Rental Revenue, for the payment amount (cash-basis
/// recognition on receipt — the same convention as Sales' payment posting). Mirrors
/// ISalesPaymentPostingService's pattern exactly.
/// </summary>
public interface IRentalPaymentPostingService
{
    Task<Result> PostRentalPaymentAsync(
        Guid paymentId, decimal amount, DateOnly paymentDate, string? referenceNumber, CancellationToken ct = default);
}
