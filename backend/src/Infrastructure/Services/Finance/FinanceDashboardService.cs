using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance.Dashboard;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services.Sales;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class FinanceDashboardService : IFinanceDashboardService
{
    private readonly AppDbContext _db;

    public FinanceDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FinanceDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var postedLines = await (
                from line in _db.JournalLines
                join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
                where entry.Status == JournalEntryStatus.Posted
                select new { line.AccountId, line.Debit, line.Credit })
            .ToListAsync(ct);

        var accounts = await _db.Accounts.ToDictionaryAsync(a => a.Id, ct);

        decimal SumByType(AccountType type, bool debitNormal) =>
            postedLines.Where(l => accounts.TryGetValue(l.AccountId, out var a) && a.Type == type)
                .Sum(l => debitNormal ? l.Debit - l.Credit : l.Credit - l.Debit);

        var totalRevenue = postedLines.Where(l => accounts.TryGetValue(l.AccountId, out var a) && a.Type == AccountType.Revenue).Sum(l => l.Credit);
        var totalExpenses = postedLines.Where(l => accounts.TryGetValue(l.AccountId, out var a) && a.Type == AccountType.Expense).Sum(l => l.Debit);
        var totalAssets = SumByType(AccountType.Asset, debitNormal: true);
        var totalLiabilities = SumByType(AccountType.Liability, debitNormal: false);
        var totalEquity = SumByType(AccountType.Equity, debitNormal: false);

        var totalCollected = await _db.Payments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        var openInstallments = await _db.Installments
            .Where(i => i.Status != InstallmentStatus.Cancelled)
            .Select(i => new { i.Amount, i.PaidAmount, i.DueDate, i.PaymentPlanId })
            .ToListAsync(ct);
        var gracePeriods = await _db.PaymentPlans.Select(p => new { p.Id, p.GracePeriodDays }).ToDictionaryAsync(p => p.Id, p => p.GracePeriodDays, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var outstanding = openInstallments.Where(i => i.Amount - i.PaidAmount > 0).ToList();
        var totalReceivable = outstanding.Sum(i => i.Amount - i.PaidAmount);
        var overdueReceivable = outstanding
            .Where(i => i.DueDate.AddDays(gracePeriods.GetValueOrDefault(i.PaymentPlanId)) < today)
            .Sum(i => i.Amount - i.PaidAmount);

        var recentEntries = await _db.JournalEntries.OrderByDescending(e => e.CreatedAt).Take(5).ToListAsync(ct);
        var recentEntryIds = recentEntries.Select(e => e.Id).ToList();
        var recentTotals = await _db.JournalLines.Where(l => recentEntryIds.Contains(l.JournalEntryId))
            .GroupBy(l => l.JournalEntryId).Select(g => new { JournalEntryId = g.Key, Total = g.Sum(l => l.Debit) })
            .ToDictionaryAsync(x => x.JournalEntryId, x => x.Total, ct);

        var recentDtos = recentEntries.Select(e => new RecentJournalEntryDto(
            e.Id, e.EntryNumber, e.EntryDate, e.Description, e.ReferenceType, (int)e.Status,
            recentTotals.GetValueOrDefault(e.Id), e.CreatedAt)).ToList();

        return new FinanceDashboardDto(
            totalRevenue, totalCollected, totalReceivable, overdueReceivable, totalExpenses,
            totalAssets, totalLiabilities, totalEquity, recentDtos);
    }
}
