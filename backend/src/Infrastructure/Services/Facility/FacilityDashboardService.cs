using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Facility.Dashboard;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Facility;

public class FacilityDashboardService : IFacilityDashboardService
{
    private readonly AppDbContext _db;

    public FacilityDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FacilityDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var totalFacilities = await _db.Facilities.CountAsync(ct);
        var spaces = await _db.Spaces.ToListAsync(ct);
        var occupiedSpaces = spaces.Count(s => s.Status == SpaceStatus.Occupied);
        var availableSpaces = spaces.Count(s => s.Status == SpaceStatus.Available);
        var occupancyRate = spaces.Count == 0 ? 0 : Math.Round((decimal)occupiedSpaces / spaces.Count * 100, 2);

        var activeMemberships = await _db.Memberships.CountAsync(m => m.Status == MembershipStatus.Active, ct);
        var activeLeasesOnMallShops = await (
            from lease in _db.Leases
            join space in _db.Spaces on lease.UnitId equals space.PropertyUnitId
            where lease.Status == LeaseStatus.Active
            select lease.Id).CountAsync(ct);
        var activeTenantsOrMembers = activeMemberships + activeLeasesOnMallShops;

        var openMaintenance = await _db.MaintenanceRequests
            .CountAsync(m => m.FacilityId != null && m.Status != MaintenanceStatus.Resolved && m.Status != MaintenanceStatus.Cancelled, ct);
        var openServiceRequests = await _db.FacilityServiceRequests
            .CountAsync(s => s.Status != MaintenanceStatus.Resolved && s.Status != MaintenanceStatus.Cancelled, ct);

        var totalRevenue = await _db.FacilityPayments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var serviceChargeOutstanding = await _db.ServiceChargeCharges
            .Where(c => c.Status != Domain.Facility.Mall.ServiceChargeStatus.Cancelled)
            .SumAsync(c => (decimal?)(c.Amount - c.PaidAmount), ct) ?? 0;
        var parkingOutstanding = await _db.ParkingAllocations.SumAsync(a => (decimal?)(a.Amount - a.PaidAmount), ct) ?? 0;
        var membershipOutstanding = await _db.Memberships.SumAsync(m => (decimal?)(m.Amount - m.PaidAmount), ct) ?? 0;
        var bookingOutstanding = await _db.CoworkingBookings
            .Where(b => b.Status != BookingStatus.Cancelled)
            .SumAsync(b => (decimal?)(b.Price - b.PaidAmount), ct) ?? 0;
        var utilityOutstanding = await _db.UtilityReadings
            .Where(u => u.Amount != null)
            .SumAsync(u => (decimal?)(u.Amount!.Value - u.PaidAmount), ct) ?? 0;
        var outstandingReceivables = serviceChargeOutstanding + parkingOutstanding + membershipOutstanding + bookingOutstanding + utilityOutstanding;

        var utilitySummary = await _db.UtilityReadings
            .GroupBy(u => u.Type)
            .Select(g => new UtilityTypeSummaryDto(g.Key.ToString(), g.Sum(u => u.Consumption), g.Sum(u => u.Amount ?? 0)))
            .ToListAsync(ct);

        var today = DateTimeOffset.UtcNow;
        var upcomingEvents = await (
            from e in _db.FacilityEvents
            join f in _db.Facilities on e.FacilityId equals f.Id
            where e.StartAt >= today && e.Status != Domain.Facility.Mall.FacilityEventStatus.Cancelled
            orderby e.StartAt
            select new UpcomingFacilityEventDto(e.Id, e.Title, e.FacilityId, f.Name, e.StartAt))
            .Take(10).ToListAsync(ct);

        return new FacilityDashboardDto(
            totalFacilities, spaces.Count, occupiedSpaces, availableSpaces, occupancyRate, activeTenantsOrMembers,
            openMaintenance, openServiceRequests, totalRevenue, outstandingReceivables, utilitySummary, upcomingEvents);
    }
}
