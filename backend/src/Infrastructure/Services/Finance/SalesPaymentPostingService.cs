using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class SalesPaymentPostingService : ISalesPaymentPostingService
{
    private readonly AppDbContext _db;

    public SalesPaymentPostingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Result> PostSalesPaymentAsync(
        Guid paymentId, Guid customerId, decimal amount, DateOnly paymentDate, string? referenceNumber, CancellationToken ct = default)
    {
        var cashAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.CashAndBankAccountCode, ct);
        var revenueAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.SalesRevenueAccountCode, ct);
        if (cashAccount is null || revenueAccount is null)
        {
            return Result.Failure("Finance system accounts are not configured for this tenant.", "accounts_not_configured");
        }

        var entrySequence = await _db.JournalEntries.CountAsync(ct) + 1;
        var journalEntry = new JournalEntry
        {
            EntryNumber = $"JE-{entrySequence:D6}",
            EntryDate = paymentDate,
            Description = $"Sales payment{(referenceNumber is null ? "" : $" ({referenceNumber})")}",
            ReferenceType = "SalesPayment",
            ReferenceId = paymentId,
            Status = JournalEntryStatus.Posted
        };
        _db.JournalEntries.Add(journalEntry);

        _db.JournalLines.AddRange(
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = cashAccount.Id, Debit = amount, Credit = 0, Description = "Cash received" },
            new JournalLine { JournalEntryId = journalEntry.Id, AccountId = revenueAccount.Id, Debit = 0, Credit = amount, Description = "Sales revenue recognized" });

        var documentSequence = await _db.FinancialDocuments.CountAsync(ct) + 1;
        _db.FinancialDocuments.Add(new FinancialDocument
        {
            DocumentNumber = $"RCPT-DOC-{documentSequence:D6}",
            Type = FinancialDocumentType.Receipt,
            Status = FinancialDocumentStatus.Issued,
            CustomerId = customerId,
            Amount = amount,
            IssueDate = paymentDate,
            ReferenceType = "SalesPayment",
            ReferenceId = paymentId,
            JournalEntryId = journalEntry.Id
        });

        return Result.Success();
    }
}
