using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Construction;

/// <summary>
/// A payment against an Approved Expense that clears (part of) the Accounts Payable balance that
/// expense's approval created — Dr Accounts Payable, Cr Cash, via
/// IConstructionFinancePostingService.PostExpensePaymentAsync. Mirrors the source-row-per-posting
/// pattern used by RentPayment/FacilityPayment/Sales.Payment elsewhere, since the
/// (TenantId, ReferenceType, ReferenceId) duplicate-posting index needs one row per payment, not per
/// expense (an expense can be paid in installments).
/// </summary>
public class ExpensePayment : TenantEntity
{
    public string ReceiptNumber { get; set; } = default!;
    public Guid ExpenseId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public Guid RecordedByUserId { get; set; }
    public string? IdempotencyKey { get; set; }
    public Guid? JournalEntryId { get; set; }
}
