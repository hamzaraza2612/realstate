using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance;

/// <summary>
/// The Sales -> Finance integration seam. Adds the journal entry (and receipt document) for a sales
/// payment to the ambient DbContext's change tracker — it deliberately does not call SaveChanges itself,
/// so the caller (Sales' PaymentService) persists the payment and its financial postings in one
/// transaction. Accounting mapping: Dr Cash and Bank, Cr Sales Revenue, for the payment amount
/// (cash-basis recognition on receipt — see docs/DATABASE.md for why revenue isn't recognized earlier).
/// </summary>
public interface ISalesPaymentPostingService
{
    Task<Result> PostSalesPaymentAsync(
        Guid paymentId, Guid customerId, decimal amount, DateOnly paymentDate, string? referenceNumber, CancellationToken ct = default);
}
