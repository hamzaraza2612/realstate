using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Property.RentalDashboard;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Property;

public class RentalDashboardService : IRentalDashboardService
{
    private readonly AppDbContext _db;

    public RentalDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<RentalDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expiringCutoff = today.AddDays(30);

        var activeLeases = await _db.Leases.Where(l => l.Status == LeaseStatus.Active).ToListAsync(ct);
        var leaseGraceDays = activeLeases.ToDictionary(l => l.Id, l => l.GracePeriodDays);

        var units = await _db.PropertyUnits.ToListAsync(ct);
        var tenantIds = activeLeases.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));
        var unitNumbers = units.ToDictionary(u => u.Id, u => u.UnitNumber);

        var upcomingExpirations = activeLeases
            .Where(l => l.EndDate <= expiringCutoff)
            .OrderBy(l => l.EndDate)
            .Take(10)
            .Select(l => new LeaseExpiringDto(l.Id, l.LeaseNumber, unitNumbers.GetValueOrDefault(l.UnitId, ""), tenantNames.GetValueOrDefault(l.RentalTenantId, ""), l.EndDate))
            .ToList();

        var openSchedules = await _db.RentSchedules
            .Where(r => r.Status == RentScheduleStatus.Pending || r.Status == RentScheduleStatus.PartiallyPaid)
            .ToListAsync(ct);
        var rentDue = openSchedules.Where(r => r.DueDate <= today).Sum(r => r.Amount - r.PaidAmount);
        var outstandingRent = openSchedules.Sum(r => r.Amount - r.PaidAmount);
        var overdueObligations = openSchedules.Count(r => today > r.DueDate.AddDays(leaseGraceDays.GetValueOrDefault(r.LeaseId, 0)));

        var collectedRent = await _db.RentPayments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var recentPayments = await _db.RentPayments
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new { p.Id, p.ReceiptNumber, p.LeaseId, p.Amount, p.PaymentDate })
            .ToListAsync(ct);
        var recentLeaseNumbers = await _db.Leases
            .Where(l => recentPayments.Select(p => p.LeaseId).Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.LeaseNumber, ct);

        var totalUnits = units.Count;
        var occupiedUnits = units.Count(u => u.Status == PropertyUnitStatus.Occupied);

        return new RentalDashboardDto(
            activeLeases.Count, upcomingExpirations, rentDue, collectedRent, outstandingRent, overdueObligations,
            totalUnits, occupiedUnits,
            recentPayments.Select(p => new RecentRentPaymentDto(p.Id, p.ReceiptNumber, recentLeaseNumbers.GetValueOrDefault(p.LeaseId, ""), p.Amount, p.PaymentDate)).ToList());
    }
}
