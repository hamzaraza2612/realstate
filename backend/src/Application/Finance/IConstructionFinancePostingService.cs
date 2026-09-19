using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance;

/// <summary>
/// The Construction -> Finance integration seam, mirroring ISalesPaymentPostingService. Adds the
/// journal entry for an approved expense to the ambient DbContext's change tracker without calling
/// SaveChanges — the caller (Construction's ExpenseService) persists the expense approval and its
/// ledger posting in one transaction. Accounting mapping: Dr Construction Expenses, Cr Accounts
/// Payable, for the expense amount (accrual — the obligation is recognized on approval, not on actual
/// cash payment to the vendor, which is a future module). See docs/DATABASE.md.
/// </summary>
public interface IConstructionFinancePostingService
{
    Task<Result<Guid>> PostExpenseApprovalAsync(Guid expenseId, decimal amount, DateOnly expenseDate, string? referenceNumber, CancellationToken ct = default);
}
