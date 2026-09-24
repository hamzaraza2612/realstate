using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class MallDashboardService : IMallDashboardService
{
    private readonly AppDbContext _db;

    public MallDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<MallDashboardDto> GetAsync(Guid? facilityId, CancellationToken ct = default)
    {
        var mallFacilityIds = facilityId.HasValue
            ? new List<Guid> { facilityId.Value }
            : await _db.Facilities.Where(f => f.Type == FacilityType.ShoppingMall).Select(f => f.Id).ToListAsync(ct);

        var shops = await _db.Spaces.Where(s => mallFacilityIds.Contains(s.FacilityId) && s.Type == SpaceType.Shop).ToListAsync(ct);
        var totalShops = shops.Count;
        var occupiedShops = shops.Count(s => s.Status == SpaceStatus.Occupied);
        var vacantShops = shops.Count(s => s.Status == SpaceStatus.Available);
        var occupancyRate = totalShops == 0 ? 0 : Math.Round((decimal)occupiedShops / totalShops * 100, 2);

        var unitIds = shops.Where(s => s.PropertyUnitId.HasValue).Select(s => s.PropertyUnitId!.Value).ToList();
        var activeLeases = await _db.Leases.Where(l => unitIds.Contains(l.UnitId) && l.Status == LeaseStatus.Active).ToListAsync(ct);
        var leaseIds = activeLeases.Select(l => l.Id).ToList();

        var rentSchedules = await _db.RentSchedules
            .Where(r => leaseIds.Contains(r.LeaseId) && (r.Status == RentScheduleStatus.Pending || r.Status == RentScheduleStatus.PartiallyPaid))
            .ToListAsync(ct);
        var rentDue = rentSchedules.Sum(r => r.Amount - r.PaidAmount);
        var rentCollected = await _db.RentPayments.Where(p => leaseIds.Contains(p.LeaseId)).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var serviceChargesOutstanding = await _db.ServiceChargeCharges
            .Where(c => leaseIds.Contains(c.LeaseId) && c.Status != ServiceChargeStatus.Cancelled)
            .SumAsync(c => (decimal?)(c.Amount - c.PaidAmount), ct) ?? 0;

        var parkingSpaces = await _db.ParkingSpaces.Where(p => mallFacilityIds.Contains(p.FacilityId)).ToListAsync(ct);
        var parkingOccupied = parkingSpaces.Count(p => p.Status == ParkingSpaceStatus.Allocated);

        var openMaintenance = await _db.MaintenanceRequests
            .CountAsync(m => m.FacilityId != null && mallFacilityIds.Contains(m.FacilityId.Value) && m.Status != MaintenanceStatus.Resolved && m.Status != MaintenanceStatus.Cancelled, ct);

        var today = DateTimeOffset.UtcNow;
        var upcomingEvents = await _db.FacilityEvents
            .CountAsync(e => mallFacilityIds.Contains(e.FacilityId) && e.StartAt >= today && e.Status != FacilityEventStatus.Cancelled, ct);
        var unacknowledgedNotices = await _db.TenantNotices
            .CountAsync(n => mallFacilityIds.Contains(n.FacilityId) && n.Status != TenantNoticeStatus.Acknowledged, ct);

        var parkingFees = await _db.ParkingAllocations.Where(a => parkingSpaces.Select(p => p.Id).Contains(a.ParkingSpaceId)).SumAsync(a => (decimal?)a.PaidAmount, ct) ?? 0;
        var revenueSummary = rentCollected + parkingFees;

        return new MallDashboardDto(
            totalShops, occupiedShops, vacantShops, occupancyRate, activeLeases.Count, rentDue, rentCollected,
            serviceChargesOutstanding, parkingOccupied, parkingSpaces.Count, openMaintenance, upcomingEvents, unacknowledgedNotices, revenueSummary);
    }
}
