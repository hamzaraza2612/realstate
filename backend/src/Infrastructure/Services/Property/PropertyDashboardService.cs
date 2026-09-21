using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Property.Dashboard;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Property;

public class PropertyDashboardService : IPropertyDashboardService
{
    private readonly AppDbContext _db;

    public PropertyDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PropertyDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expiringCutoff = today.AddDays(30);

        var totalProperties = await _db.Properties.CountAsync(ct);
        var units = await _db.PropertyUnits.ToListAsync(ct);
        var totalUnits = units.Count;
        var occupiedUnits = units.Count(u => u.Status == PropertyUnitStatus.Occupied);
        var availableUnits = units.Count(u => u.Status == PropertyUnitStatus.Available);
        var occupancyRate = totalUnits == 0 ? 0 : Math.Round((decimal)occupiedUnits / totalUnits * 100, 2);

        var activeLeases = await _db.Leases.Where(l => l.Status == LeaseStatus.Active).ToListAsync(ct);
        var expiringLeases = activeLeases.Count(l => l.EndDate <= expiringCutoff);

        var monthlyRentalIncome = activeLeases.Sum(l => NormalizeToMonthly(l.RentAmount, l.PaymentFrequency));

        var openSchedules = await _db.RentSchedules
            .Where(r => r.Status == RentScheduleStatus.Pending || r.Status == RentScheduleStatus.PartiallyPaid)
            .ToListAsync(ct);
        var leaseGraceDays = activeLeases.ToDictionary(l => l.Id, l => l.GracePeriodDays);
        var outstandingRent = openSchedules.Sum(r => r.Amount - r.PaidAmount);
        var overdueRent = openSchedules
            .Where(r => today > r.DueDate.AddDays(leaseGraceDays.GetValueOrDefault(r.LeaseId, 0)))
            .Sum(r => r.Amount - r.PaidAmount);

        var openMaintenanceRequests = await _db.MaintenanceRequests
            .CountAsync(m => m.Status != MaintenanceStatus.Resolved && m.Status != MaintenanceStatus.Cancelled, ct);

        var properties = await _db.Properties.ToListAsync(ct);
        var performance = properties
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p =>
            {
                var propertyUnits = units.Where(u => u.PropertyId == p.Id).ToList();
                var propertyOccupied = propertyUnits.Count(u => u.Status == PropertyUnitStatus.Occupied);
                var propertyLeases = activeLeases.Where(l => l.PropertyId == p.Id).ToList();
                var propertyIncome = propertyLeases.Sum(l => NormalizeToMonthly(l.RentAmount, l.PaymentFrequency));
                var propertyLeaseIds = propertyLeases.Select(l => l.Id).ToHashSet();
                var propertyOutstanding = openSchedules.Where(r => propertyLeaseIds.Contains(r.LeaseId)).Sum(r => r.Amount - r.PaidAmount);

                return new PropertyPerformanceDto(p.Id, p.Name, propertyUnits.Count, propertyOccupied, propertyIncome, propertyOutstanding);
            }).ToList();

        return new PropertyDashboardDto(
            totalProperties, totalUnits, occupiedUnits, availableUnits, occupancyRate,
            activeLeases.Count, expiringLeases, monthlyRentalIncome, outstandingRent, overdueRent,
            openMaintenanceRequests, performance);
    }

    /// <summary>Documented normalization for the dashboard's single "monthly income" figure: Quarterly and
    /// Yearly rents are divided evenly across their period so the figure is comparable across leases on
    /// different frequencies — a display convenience, not a persisted value.</summary>
    private static decimal NormalizeToMonthly(decimal rentAmount, LeasePaymentFrequency frequency) => frequency switch
    {
        LeasePaymentFrequency.Quarterly => Math.Round(rentAmount / 3, 2),
        LeasePaymentFrequency.Yearly => Math.Round(rentAmount / 12, 2),
        _ => rentAmount
    };
}
