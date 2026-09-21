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

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(DateOnly? asOf, CancellationToken ct = default)
    {
        var cutoff = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await (
                from line in _db.JournalLines
                join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
                join account in _db.Accounts on line.AccountId equals account.Id
                where entry.Status == JournalEntryStatus.Posted && entry.EntryDate <= cutoff
                select new { account.Id, account.Code, account.Name, account.Type, line.Debit, line.Credit })
            .ToListAsync(ct);

        List<FinancialStatementLineDto> LinesFor(AccountType type, bool debitNormal) => rows
            .Where(r => r.Type == type)
            .GroupBy(r => new { r.Id, r.Code, r.Name })
            .Select(g => new FinancialStatementLineDto(g.Key.Id, g.Key.Code, g.Key.Name,
                debitNormal ? g.Sum(r => r.Debit - r.Credit) : g.Sum(r => r.Credit - r.Debit)))
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.Code)
            .ToList();

        var assets = LinesFor(AccountType.Asset, debitNormal: true);
        var liabilities = LinesFor(AccountType.Liability, debitNormal: false);
        var equity = LinesFor(AccountType.Equity, debitNormal: false);
        var netIncome = rows.Where(r => r.Type == AccountType.Revenue).Sum(r => r.Credit - r.Debit)
                       - rows.Where(r => r.Type == AccountType.Expense).Sum(r => r.Debit - r.Credit);

        var totalAssets = assets.Sum(l => l.Amount);
        var totalLiabilities = liabilities.Sum(l => l.Amount);
        var totalEquity = equity.Sum(l => l.Amount);

        return new BalanceSheetDto(cutoff, assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity,
            netIncome, totalLiabilities + totalEquity + netIncome);
    }

    public async Task<ProfitAndLossDto> GetProfitAndLossAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var query =
            from line in _db.JournalLines
            join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
            join account in _db.Accounts on line.AccountId equals account.Id
            where entry.Status == JournalEntryStatus.Posted
            select new { account.Id, account.Code, account.Name, account.Type, entry.EntryDate, line.Debit, line.Credit };

        if (from.HasValue) query = query.Where(x => x.EntryDate >= from);
        if (to.HasValue) query = query.Where(x => x.EntryDate <= to);

        var rows = await query.ToListAsync(ct);

        List<FinancialStatementLineDto> LinesFor(AccountType type, Func<decimal, decimal, decimal> amount) => rows
            .Where(r => r.Type == type)
            .GroupBy(r => new { r.Id, r.Code, r.Name })
            .Select(g => new FinancialStatementLineDto(g.Key.Id, g.Key.Code, g.Key.Name, g.Sum(r => amount(r.Debit, r.Credit))))
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.Code)
            .ToList();

        var revenueLines = LinesFor(AccountType.Revenue, (d, c) => c - d);
        var expenseLines = LinesFor(AccountType.Expense, (d, c) => d - c);
        var totalRevenue = revenueLines.Sum(l => l.Amount);
        var totalExpenses = expenseLines.Sum(l => l.Amount);

        return new ProfitAndLossDto(from, to, revenueLines, totalRevenue, expenseLines, totalExpenses, totalRevenue - totalExpenses);
    }

    public async Task<CashFlowDto> GetCashFlowAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var cashAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == FinanceConstants.CashAndBankAccountCode, ct);
        if (cashAccount is null) return new CashFlowDto(from, to, 0, [], 0, [], 0, 0, 0);

        decimal openingCash = 0m;
        if (from.HasValue)
        {
            var openingCutoff = from.Value;
            openingCash = await _db.JournalLines
                .Join(_db.JournalEntries, line => line.JournalEntryId, entry => entry.Id, (line, entry) => new { line, entry })
                .Where(x => x.entry.Status == JournalEntryStatus.Posted && x.line.AccountId == cashAccount.Id && x.entry.EntryDate < openingCutoff)
                .SumAsync(x => x.line.Debit - x.line.Credit, ct);
        }

        var periodQuery =
            from line in _db.JournalLines
            join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
            where entry.Status == JournalEntryStatus.Posted && line.AccountId == cashAccount.Id
            select new { entry.ReferenceType, entry.EntryDate, line.Debit, line.Credit };

        if (from.HasValue) periodQuery = periodQuery.Where(x => x.EntryDate >= from);
        if (to.HasValue) periodQuery = periodQuery.Where(x => x.EntryDate <= to);

        var periodRows = await periodQuery.ToListAsync(ct);

        var inflows = periodRows.Where(r => r.Debit > 0)
            .GroupBy(r => r.ReferenceType)
            .Select(g => new CashFlowCategoryDto(g.Key, g.Sum(r => r.Debit)))
            .OrderByDescending(c => c.Amount)
            .ToList();
        var outflows = periodRows.Where(r => r.Credit > 0)
            .GroupBy(r => r.ReferenceType)
            .Select(g => new CashFlowCategoryDto(g.Key, g.Sum(r => r.Credit)))
            .OrderByDescending(c => c.Amount)
            .ToList();

        var totalInflows = inflows.Sum(c => c.Amount);
        var totalOutflows = outflows.Sum(c => c.Amount);
        var netChange = totalInflows - totalOutflows;

        return new CashFlowDto(from, to, openingCash, inflows, totalInflows, outflows, totalOutflows, netChange, openingCash + netChange);
    }
}
