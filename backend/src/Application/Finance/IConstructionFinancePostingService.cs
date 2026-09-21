using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance;

/// <summary>
/// The Construction -> Finance integration seam, mirroring ISalesPaymentPostingService. Adds the
/// journal entry for an approved expense to the ambient DbContext's change tracker without calling
/// SaveChanges — the caller (Construction's ExpenseService) persists the expense approval and its
/// ledger posting in one transaction. Accounting mapping: Dr Construction Expenses, Cr Accounts
/// Payable, for the expense amount (accrual — the obligation is recognized on approval, not on actual
/// cash payment to the vendor). See docs/DATABASE.md.
/// </summary>
public interface IConstructionFinancePostingService
{
    Task<Result<Guid>> PostExpenseApprovalAsync(Guid expenseId, decimal amount, DateOnly expenseDate, string? referenceNumber, CancellationToken ct = default);

    /// <summary>AP clearing: Dr Accounts Payable, Cr Cash and Bank, for the amount actually paid to the
    /// vendor. <paramref name="expensePaymentId"/> is the ExpensePayment row's own Id (not the
    /// Expense's), since one expense can be paid in several installments and the duplicate-posting
    /// index needs a distinct ReferenceId per payment.</summary>
    Task<Result<Guid>> PostExpensePaymentAsync(Guid expensePaymentId, decimal amount, DateOnly paymentDate, string? referenceNumber, CancellationToken ct = default);
}
