using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class FinanceReportsExtensionService : IFinanceReportsExtensionService
{
    private readonly AppDbContext _db;

    public FinanceReportsExtensionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ArAgingReportDto> GetArAgingAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var installments = await _db.Installments
            .Where(i => i.Status != Domain.Sales.InstallmentStatus.Cancelled && i.Amount > i.PaidAmount)
            .ToListAsync(ct);
        if (installments.Count == 0) return new ArAgingReportDto([], 0);

        var bookingIds = installments.Select(i => i.BookingId).Distinct().ToList();
        var bookings = await _db.Bookings.Where(b => bookingIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id, ct);
        var customerIds = bookings.Values.Select(b => b.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var planGraceDays = await _db.PaymentPlans.Select(p => new { p.Id, p.GracePeriodDays }).ToDictionaryAsync(p => p.Id, p => p.GracePeriodDays, ct);

        var buckets = new Dictionary<Guid, decimal[]>();
        foreach (var installment in installments)
        {
            if (!bookings.TryGetValue(installment.BookingId, out var booking)) continue;
            var outstanding = installment.Amount - installment.PaidAmount;
            var graceDays = planGraceDays.GetValueOrDefault(installment.PaymentPlanId);
            var daysPastDue = today.DayNumber - installment.DueDate.AddDays(graceDays).DayNumber;
            AddToBucket(buckets, booking.CustomerId, daysPastDue, outstanding);
        }

        var rows = buckets.Select(kv => new ArAgingCustomerRowDto(
                kv.Key, customerNames.GetValueOrDefault(kv.Key, ""),
                kv.Value[0], kv.Value[1], kv.Value[2], kv.Value[3], kv.Value[4], kv.Value.Sum()))
            .OrderByDescending(r => r.Total)
            .ToList();

        return new ArAgingReportDto(rows, rows.Sum(r => r.Total));
    }

    public async Task<ApAgingReportDto> GetApAgingAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var expenses = await _db.Expenses
            .Where(e => e.Status == ExpenseStatus.Approved && e.Amount > e.PaidAmount)
            .ToListAsync(ct);
        if (expenses.Count == 0) return new ApAgingReportDto([], 0);

        var vendorIds = expenses.Where(e => e.VendorId.HasValue).Select(e => e.VendorId!.Value).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        var buckets = new Dictionary<Guid, decimal[]>();
        foreach (var expense in expenses)
        {
            var vendorKey = expense.VendorId ?? Guid.Empty;
            var outstanding = expense.Amount - expense.PaidAmount;
            var daysPastDue = today.DayNumber - expense.ExpenseDate.DayNumber;
            AddToBucket(buckets, vendorKey, daysPastDue, outstanding);
        }

        var rows = buckets.Select(kv => new ApAgingVendorRowDto(
                kv.Key, kv.Key == Guid.Empty ? "(No vendor)" : vendorNames.GetValueOrDefault(kv.Key, ""),
                kv.Value[0], kv.Value[1], kv.Value[2], kv.Value[3], kv.Value[4], kv.Value.Sum()))
            .OrderByDescending(r => r.Total)
            .ToList();

        return new ApAgingReportDto(rows, rows.Sum(r => r.Total));
    }

    private static void AddToBucket(Dictionary<Guid, decimal[]> buckets, Guid key, int daysPastDue, decimal amount)
    {
        if (!buckets.TryGetValue(key, out var arr))
        {
            arr = new decimal[5];
            buckets[key] = arr;
        }

        var index = AgingBucket.For(daysPastDue) switch
        {
            AgingBucket.Current => 0,
            AgingBucket.Days1To30 => 1,
            AgingBucket.Days31To60 => 2,
            AgingBucket.Days61To90 => 3,
            _ => 4
        };
        arr[index] += amount;
    }

    public async Task<IReadOnlyList<MonthlyTrendRowDto>> GetRevenueTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        await MonthlyJournalTrendAsync(AccountType.Revenue, (d, c) => c - d, from, to, ct);

    public async Task<IReadOnlyList<MonthlyTrendRowDto>> GetExpenseTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        await MonthlyJournalTrendAsync(AccountType.Expense, (d, c) => d - c, from, to, ct);

    private async Task<IReadOnlyList<MonthlyTrendRowDto>> MonthlyJournalTrendAsync(
        AccountType type, Func<decimal, decimal, decimal> amount, DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var rows = await (
                from line in _db.JournalLines
                join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
                join account in _db.Accounts on line.AccountId equals account.Id
                where entry.Status == JournalEntryStatus.Posted && account.Type == type
                      && entry.EntryDate >= resolvedFrom && entry.EntryDate <= resolvedTo
                select new { entry.EntryDate, line.Debit, line.Credit })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => new { r.EntryDate.Year, r.EntryDate.Month })
            .Select(g => new MonthlyTrendRowDto(g.Key.Year, g.Key.Month, g.Sum(r => amount(r.Debit, r.Credit))))
            .OrderBy(r => r.Year).ThenBy(r => r.Month)
            .ToList();
    }

    public async Task<IReadOnlyList<MonthlyTrendRowDto>> GetCollectionsTrendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var salesPayments = await _db.Payments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .Select(p => new { p.PaymentDate, p.Amount })
            .ToListAsync(ct);
        var rentPayments = await _db.RentPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .Select(p => new { p.PaymentDate, p.Amount })
            .ToListAsync(ct);
        var facilityPayments = await _db.FacilityPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .Select(p => new { p.PaymentDate, p.Amount })
            .ToListAsync(ct);

        return salesPayments.Concat(rentPayments).Concat(facilityPayments)
            .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
            .Select(g => new MonthlyTrendRowDto(g.Key.Year, g.Key.Month, g.Sum(p => p.Amount)))
            .OrderBy(r => r.Year).ThenBy(r => r.Month)
            .ToList();
    }
}
