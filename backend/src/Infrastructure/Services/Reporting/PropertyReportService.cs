using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class PropertyReportService : IPropertyReportService
{
    private readonly AppDbContext _db;

    public PropertyReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PropertyOccupancyRowDto>> OccupancyAsync(CancellationToken ct = default)
    {
        var rows = await _db.PropertyUnits
            .GroupBy(u => u.PropertyId)
            .Select(g => new { PropertyId = g.Key, Total = g.Count(), Occupied = g.Count(u => u.Status == PropertyUnitStatus.Occupied) })
            .ToListAsync(ct);

        var propertyNames = await _db.Properties.Where(p => rows.Select(r => r.PropertyId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return rows.Select(r => new PropertyOccupancyRowDto(
                r.PropertyId, propertyNames.GetValueOrDefault(r.PropertyId, ""), r.Total, r.Occupied,
                r.Total == 0 ? 0 : Math.Round(r.Occupied * 100m / r.Total, 1)))
            .OrderBy(r => r.PropertyName)
            .ToList();
    }

    public async Task<IReadOnlyList<RentBilledRowDto>> RentBilledAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var scheduleAmounts = await _db.RentSchedules
            .Where(r => r.DueDate >= resolvedFrom && r.DueDate <= resolvedTo)
            .Join(_db.Leases, r => r.LeaseId, l => l.Id, (r, l) => new { l.PropertyId, r.Amount })
            .GroupBy(x => x.PropertyId)
            .Select(g => new RentBilledRowDto(g.Key, "", g.Sum(x => x.Amount)))
            .ToListAsync(ct);

        var propertyNames = await _db.Properties.Where(p => scheduleAmounts.Select(r => r.PropertyId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return scheduleAmounts.Select(r => r with { PropertyName = propertyNames.GetValueOrDefault(r.PropertyId, "") })
            .OrderBy(r => r.PropertyName)
            .ToList();
    }

    public async Task<IReadOnlyList<RentCollectedRowDto>> RentCollectedAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var paymentAmounts = await _db.RentPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .Join(_db.Leases, p => p.LeaseId, l => l.Id, (p, l) => new { l.PropertyId, p.Amount })
            .GroupBy(x => x.PropertyId)
            .Select(g => new RentCollectedRowDto(g.Key, "", g.Sum(x => x.Amount)))
            .ToListAsync(ct);

        var propertyNames = await _db.Properties.Where(p => paymentAmounts.Select(r => r.PropertyId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return paymentAmounts.Select(r => r with { PropertyName = propertyNames.GetValueOrDefault(r.PropertyId, "") })
            .OrderBy(r => r.PropertyName)
            .ToList();
    }

    public async Task<IReadOnlyList<OverdueRentRowDto>> OverdueRentAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var openSchedules = await _db.RentSchedules
            .Where(r => r.Status == RentScheduleStatus.Pending || r.Status == RentScheduleStatus.PartiallyPaid)
            .ToListAsync(ct);
        if (openSchedules.Count == 0) return [];

        var leaseIds = openSchedules.Select(s => s.LeaseId).Distinct().ToList();
        var leases = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, ct);
        var propertyNames = await _db.Properties.Where(p => leases.Values.Select(l => l.PropertyId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var tenantIds = leases.Values.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        var customerIds = tenants.Values.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);

        var rows = new List<OverdueRentRowDto>();
        foreach (var schedule in openSchedules)
        {
            if (!leases.TryGetValue(schedule.LeaseId, out var lease)) continue;
            var graceDeadline = schedule.DueDate.AddDays(lease.GracePeriodDays);
            if (today <= graceDeadline) continue;

            var tenantName = tenants.TryGetValue(lease.RentalTenantId, out var tenant)
                ? customerNames.GetValueOrDefault(tenant.CustomerId, "")
                : "";
            rows.Add(new OverdueRentRowDto(
                lease.Id, lease.LeaseNumber, lease.PropertyId, propertyNames.GetValueOrDefault(lease.PropertyId, ""), tenantName,
                schedule.Amount - schedule.PaidAmount, schedule.DueDate, today.DayNumber - graceDeadline.DayNumber));
        }

        return rows.OrderByDescending(r => r.DaysPastDue).ToList();
    }

    public async Task<IReadOnlyList<PropertyRevenueRowDto>> RevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var collected = await RentCollectedAsync(from, to, ct);
        return collected.Select(c => new PropertyRevenueRowDto(c.PropertyId, c.PropertyName, c.AmountCollected)).ToList();
    }

    public async Task<IReadOnlyList<TenantAgingRowDto>> TenantAgingAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var openSchedules = await _db.RentSchedules
            .Where(r => r.Status != RentScheduleStatus.Cancelled && r.Amount > r.PaidAmount)
            .ToListAsync(ct);
        if (openSchedules.Count == 0) return [];

        var leaseIds = openSchedules.Select(s => s.LeaseId).Distinct().ToList();
        var leases = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, ct);
        var tenantIds = leases.Values.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        var customerIds = tenants.Values.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);

        var buckets = new Dictionary<Guid, decimal[]>();
        foreach (var schedule in openSchedules)
        {
            if (!leases.TryGetValue(schedule.LeaseId, out var lease)) continue;
            var outstanding = schedule.Amount - schedule.PaidAmount;
            var daysPastDue = today.DayNumber - schedule.DueDate.AddDays(lease.GracePeriodDays).DayNumber;
            var bucket = AgingBucket.For(daysPastDue);

            if (!buckets.TryGetValue(lease.RentalTenantId, out var arr))
            {
                arr = new decimal[5];
                buckets[lease.RentalTenantId] = arr;
            }
            var index = bucket switch
            {
                AgingBucket.Current => 0,
                AgingBucket.Days1To30 => 1,
                AgingBucket.Days31To60 => 2,
                AgingBucket.Days61To90 => 3,
                _ => 4
            };
            arr[index] += outstanding;
        }

        return buckets.Select(kv =>
        {
            var tenantName = tenants.TryGetValue(kv.Key, out var tenant) ? customerNames.GetValueOrDefault(tenant.CustomerId, "") : "";
            return new TenantAgingRowDto(kv.Key, tenantName, kv.Value[0], kv.Value[1], kv.Value[2], kv.Value[3], kv.Value[4], kv.Value.Sum());
        }).OrderByDescending(r => r.Total).ToList();
    }

    public async Task<IReadOnlyList<LeaseStatusRowDto>> LeaseStatusAsync(CancellationToken ct = default)
    {
        var rows = await _db.Leases
            .GroupBy(l => l.Status)
            .Select(g => new LeaseStatusRowDto(g.Key, g.Count()))
            .ToListAsync(ct);

        return rows.OrderBy(r => r.Status).ToList();
    }
}
