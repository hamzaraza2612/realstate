using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class RentalPaymentPostingService : IRentalPaymentPostingService
{
    private readonly AppDbContext _db;

    public RentalPaymentPostingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Result> PostRentalPaymentAsync(
        Guid paymentId, decimal amount, DateOnly paymentDate, string? referenceNumber, CancellationToken ct = default)
    {
        var cashAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.CashAndBankAccountCode, ct);
        var revenueAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.RentalRevenueAccountCode, ct);
        if (cashAccount is null || revenueAccount is null)
        {
            return Result.Failure("Finance system accounts are not configured for this tenant.", "accounts_not_configured");
        }

        var entrySequence = await _db.JournalEntries.CountAsync(ct) + 1;
        var journalEntry = new JournalEntry
        {
            EntryNumber = $"JE-{entrySequence:D6}",
            EntryDate = paymentDate,
            Description = $"Rental payment{(referenceNumber is null ? "" : $" ({referenceNumber})")}",
            ReferenceType = "RentalPayment",
            ReferenceId = paymentId,
            Status = JournalEntryStatus.Posted
        };
        _db.JournalEntries.Add(journalEntry);

        _db.JournalLines.AddRange(
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = cashAccount.Id, Debit = amount, Credit = 0, Description = "Cash received" },
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = revenueAccount.Id, Debit = 0, Credit = amount, Description = "Rental revenue recognized" });

        return Result.Success();
    }
}
