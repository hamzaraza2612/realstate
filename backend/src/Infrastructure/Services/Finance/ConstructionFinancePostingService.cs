using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class ConstructionFinancePostingService : IConstructionFinancePostingService
{
    private readonly AppDbContext _db;

    public ConstructionFinancePostingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Result<Guid>> PostExpenseApprovalAsync(
        Guid expenseId, decimal amount, DateOnly expenseDate, string? referenceNumber, CancellationToken ct = default)
    {
        var expenseAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.ConstructionExpenseAccountCode, ct);
        var payableAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.AccountsPayableAccountCode, ct);
        if (expenseAccount is null || payableAccount is null)
        {
            return Result.Failure<Guid>("Finance system accounts are not configured for this tenant.", "accounts_not_configured");
        }

        var entrySequence = await _db.JournalEntries.CountAsync(ct) + 1;
        var journalEntry = new JournalEntry
        {
            EntryNumber = $"JE-{entrySequence:D6}",
            EntryDate = expenseDate,
            Description = $"Construction expense{(referenceNumber is null ? "" : $" ({referenceNumber})")}",
            ReferenceType = "ConstructionExpense",
            ReferenceId = expenseId,
            Status = JournalEntryStatus.Posted
        };
        _db.JournalEntries.Add(journalEntry);

        _db.JournalLines.AddRange(
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = expenseAccount.Id, Debit = amount, Credit = 0, Description = "Construction expense recognized" },
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = payableAccount.Id, Debit = 0, Credit = amount, Description = "Amount payable to vendor" });

        return Result.Success(journalEntry.Id);
    }
}
