using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class FinanceReportService : IFinanceReportService
{
    private readonly AppDbContext _db;

    public FinanceReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<TrialBalanceDto> GetTrialBalanceAsync(CancellationToken ct = default)
    {
        var accounts = await _db.Accounts.OrderBy(a => a.Code).ToListAsync(ct);
        var postedTotals = await (
                from line in _db.JournalLines
                join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
                where entry.Status == JournalEntryStatus.Posted
                group line by line.AccountId into g
                select new { AccountId = g.Key, Debit = g.Sum(l => l.Debit), Credit = g.Sum(l => l.Credit) })
            .ToDictionaryAsync(x => x.AccountId, x => x, ct);

        var lines = accounts
            .Select(a =>
            {
                var totals = postedTotals.GetValueOrDefault(a.Id);
                return new TrialBalanceLineDto(a.Id, a.Code, a.Name, a.Type, totals?.Debit ?? 0m, totals?.Credit ?? 0m);
            })
            .Where(l => l.TotalDebit != 0 || l.TotalCredit != 0)
            .ToList();

        return new TrialBalanceDto(lines, lines.Sum(l => l.TotalDebit), lines.Sum(l => l.TotalCredit));
    }

    public async Task<IncomeSummaryDto> GetIncomeSummaryAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var query =
            from line in _db.JournalLines
            join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
            join account in _db.Accounts on line.AccountId equals account.Id
            where entry.Status == JournalEntryStatus.Posted
            select new { entry.EntryDate, account.Type, line.Debit, line.Credit };

        if (from.HasValue) query = query.Where(x => x.EntryDate >= from);
        if (to.HasValue) query = query.Where(x => x.EntryDate <= to);

        var rows = await query.ToListAsync(ct);
        var totalRevenue = rows.Where(r => r.Type == AccountType.Revenue).Sum(r => r.Credit - r.Debit);
        var totalExpenses = rows.Where(r => r.Type == AccountType.Expense).Sum(r => r.Debit - r.Credit);

        return new IncomeSummaryDto(from, to, totalRevenue, totalExpenses, totalRevenue - totalExpenses);
    }
}
