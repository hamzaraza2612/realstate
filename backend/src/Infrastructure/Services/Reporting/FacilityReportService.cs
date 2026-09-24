using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Facility;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using CoworkingBooking = RealEstateErp.Domain.Facility.Coworking.Booking;
using CoworkingBookingStatus = RealEstateErp.Domain.Facility.Coworking.BookingStatus;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class FacilityReportService : IFacilityReportService
{
    private readonly AppDbContext _db;

    public FacilityReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FacilityUtilizationRowDto>> UtilizationAsync(CancellationToken ct = default)
    {
        var facilities = await _db.Facilities.ToListAsync(ct);
        var spaceCounts = await _db.Spaces
            .GroupBy(s => s.FacilityId)
            .Select(g => new { FacilityId = g.Key, Total = g.Count(), Occupied = g.Count(s => s.Status == SpaceStatus.Occupied) })
            .ToDictionaryAsync(x => x.FacilityId, ct);

        return facilities.Select(f =>
        {
            var counts = spaceCounts.GetValueOrDefault(f.Id);
            var total = counts?.Total ?? 0;
            var occupied = counts?.Occupied ?? 0;
            return new FacilityUtilizationRowDto(f.Id, f.Name, f.Type, total, occupied, total == 0 ? 0 : Math.Round(occupied * 100m / total, 1));
        }).OrderBy(r => r.FacilityName).ToList();
    }

    public async Task<IReadOnlyList<MallOccupancyRowDto>> MallOccupancyAsync(CancellationToken ct = default)
    {
        var mallFacilities = await _db.Facilities.Where(f => f.Type == FacilityType.ShoppingMall).ToListAsync(ct);
        var shopCounts = await _db.Spaces
            .Where(s => s.Type == SpaceType.Shop && mallFacilities.Select(f => f.Id).Contains(s.FacilityId))
            .GroupBy(s => s.FacilityId)
            .Select(g => new { FacilityId = g.Key, Total = g.Count(), Occupied = g.Count(s => s.Status == SpaceStatus.Occupied) })
            .ToDictionaryAsync(x => x.FacilityId, ct);

        return mallFacilities.Select(f =>
        {
            var counts = shopCounts.GetValueOrDefault(f.Id);
            var total = counts?.Total ?? 0;
            var occupied = counts?.Occupied ?? 0;
            return new MallOccupancyRowDto(f.Id, f.Name, total, occupied, total == 0 ? 0 : Math.Round(occupied * 100m / total, 1));
        }).OrderBy(r => r.FacilityName).ToList();
    }

    public async Task<IReadOnlyList<ServiceChargeCollectionRowDto>> ServiceChargeCollectionAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var charges = await _db.ServiceChargeCharges
            .Where(c => c.DueDate >= resolvedFrom && c.DueDate <= resolvedTo)
            .ToListAsync(ct);
        if (charges.Count == 0) return [];

        var definitionIds = charges.Select(c => c.ServiceChargeDefinitionId).Distinct().ToList();
        var facilityByDefinition = await _db.ServiceChargeDefinitions
            .Where(d => definitionIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.FacilityId, ct);
        var facilityNames = await _db.Facilities.Where(f => facilityByDefinition.Values.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return charges
            .Where(c => facilityByDefinition.ContainsKey(c.ServiceChargeDefinitionId))
            .GroupBy(c => facilityByDefinition[c.ServiceChargeDefinitionId])
            .Select(g => new ServiceChargeCollectionRowDto(
                g.Key, facilityNames.GetValueOrDefault(g.Key, ""), g.Sum(c => c.Amount), g.Sum(c => c.PaidAmount), g.Sum(c => c.Amount - c.PaidAmount)))
            .OrderByDescending(r => r.Outstanding)
            .ToList();
    }

    public async Task<IReadOnlyList<FacilityRevenueRowDto>> RevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);

        var payments = await _db.FacilityPayments
            .Where(p => p.PaymentDate >= resolvedFrom && p.PaymentDate <= resolvedTo)
            .ToListAsync(ct);
        if (payments.Count == 0) return [];

        var facilityBySource = await ResolveFacilityIdsAsync(payments, ct);

        var facilityIds = facilityBySource.Values.Distinct().Where(id => id.HasValue).Select(id => id!.Value).ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return payments
            .Where(p => facilityBySource.GetValueOrDefault((p.SourceType, p.SourceId)).HasValue)
            .GroupBy(p => facilityBySource[(p.SourceType, p.SourceId)]!.Value)
            .Select(g => new FacilityRevenueRowDto(
                g.Key, facilityNames.GetValueOrDefault(g.Key, ""), g.Sum(p => p.Amount),
                g.GroupBy(p => p.SourceType.ToString()).ToDictionary(sg => sg.Key, sg => sg.Sum(p => p.Amount))))
            .OrderByDescending(r => r.Total)
            .ToList();
    }

    /// <summary>FacilityPayment references its source row generically (SourceType, SourceId) with
    /// no direct FacilityId — this resolves each payment's owning Facility by following that
    /// reference to its source table, one query per source type actually present in the batch.</summary>
    private async Task<Dictionary<(FacilityPaymentSourceType, Guid), Guid?>> ResolveFacilityIdsAsync(List<Domain.Facility.FacilityPayment> payments, CancellationToken ct)
    {
        var result = new Dictionary<(FacilityPaymentSourceType, Guid), Guid?>();

        var serviceChargeIds = payments.Where(p => p.SourceType == FacilityPaymentSourceType.ServiceCharge).Select(p => p.SourceId).Distinct().ToList();
        if (serviceChargeIds.Count > 0)
        {
            var charges = await _db.ServiceChargeCharges.Where(c => serviceChargeIds.Contains(c.Id)).ToListAsync(ct);
            var definitionFacility = await _db.ServiceChargeDefinitions
                .Where(d => charges.Select(c => c.ServiceChargeDefinitionId).Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.FacilityId, ct);
            foreach (var charge in charges)
                result[(FacilityPaymentSourceType.ServiceCharge, charge.Id)] = definitionFacility.GetValueOrDefault(charge.ServiceChargeDefinitionId);
        }

        var parkingIds = payments.Where(p => p.SourceType == FacilityPaymentSourceType.Parking).Select(p => p.SourceId).Distinct().ToList();
        if (parkingIds.Count > 0)
        {
            var allocations = await _db.ParkingAllocations.Where(a => parkingIds.Contains(a.Id)).ToListAsync(ct);
            var spaceFacility = await _db.ParkingSpaces
                .Where(s => allocations.Select(a => a.ParkingSpaceId).Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.FacilityId, ct);
            foreach (var allocation in allocations)
                result[(FacilityPaymentSourceType.Parking, allocation.Id)] = spaceFacility.GetValueOrDefault(allocation.ParkingSpaceId);
        }

        var membershipIds = payments.Where(p => p.SourceType == FacilityPaymentSourceType.CoworkingMembership).Select(p => p.SourceId).Distinct().ToList();
        if (membershipIds.Count > 0)
        {
            var memberships = await _db.Memberships.Where(m => membershipIds.Contains(m.Id)).ToListAsync(ct);
            var planFacility = await _db.MembershipPlans
                .Where(p => memberships.Select(m => m.PlanId).Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.FacilityId, ct);
            foreach (var membership in memberships)
                result[(FacilityPaymentSourceType.CoworkingMembership, membership.Id)] = planFacility.GetValueOrDefault(membership.PlanId);
        }

        var bookingIds = payments.Where(p => p.SourceType == FacilityPaymentSourceType.CoworkingBooking).Select(p => p.SourceId).Distinct().ToList();
        if (bookingIds.Count > 0)
        {
            var bookings = await _db.CoworkingBookings.Where(b => bookingIds.Contains(b.Id)).ToListAsync(ct);
            var deskSpace = await _db.Desks.ToDictionaryAsync(d => d.Id, d => d.SpaceId, ct);
            var roomSpace = await _db.MeetingRooms.ToDictionaryAsync(r => r.Id, r => r.SpaceId, ct);
            var spaceFacility = await _db.Spaces.ToDictionaryAsync(s => s.Id, s => s.FacilityId, ct);
            foreach (var booking in bookings)
            {
                var spaceId = booking.ResourceType == BookingResourceType.Desk
                    ? deskSpace.GetValueOrDefault(booking.ResourceId)
                    : roomSpace.GetValueOrDefault(booking.ResourceId);
                result[(FacilityPaymentSourceType.CoworkingBooking, booking.Id)] = spaceId == Guid.Empty ? null : spaceFacility.GetValueOrDefault(spaceId);
            }
        }

        var utilityIds = payments.Where(p => p.SourceType == FacilityPaymentSourceType.Utility).Select(p => p.SourceId).Distinct().ToList();
        if (utilityIds.Count > 0)
        {
            var readings = await _db.UtilityReadings.Where(u => utilityIds.Contains(u.Id)).ToListAsync(ct);
            foreach (var reading in readings)
                result[(FacilityPaymentSourceType.Utility, reading.Id)] = reading.FacilityId;
        }

        return result;
    }

    public async Task<IReadOnlyList<ParkingUtilizationRowDto>> ParkingUtilizationAsync(CancellationToken ct = default)
    {
        var counts = await _db.ParkingSpaces
            .GroupBy(s => s.FacilityId)
            .Select(g => new { FacilityId = g.Key, Total = g.Count(), Allocated = g.Count(s => s.Status == ParkingSpaceStatus.Allocated) })
            .ToListAsync(ct);
        if (counts.Count == 0) return [];

        var facilityNames = await _db.Facilities.Where(f => counts.Select(c => c.FacilityId).Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return counts.Select(c => new ParkingUtilizationRowDto(
                c.FacilityId, facilityNames.GetValueOrDefault(c.FacilityId, ""), c.Total, c.Allocated,
                c.Total == 0 ? 0 : Math.Round(c.Allocated * 100m / c.Total, 1)))
            .OrderBy(r => r.FacilityName)
            .ToList();
    }

    public async Task<IReadOnlyList<EventSummaryRowDto>> EventSummaryAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var events = await _db.FacilityEvents.ToListAsync(ct);
        if (events.Count == 0) return [];

        var facilityNames = await _db.Facilities.Where(f => events.Select(e => e.FacilityId).Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return events.GroupBy(e => e.FacilityId)
            .Select(g => new EventSummaryRowDto(
                g.Key, facilityNames.GetValueOrDefault(g.Key, ""),
                g.Count(e => e.StartAt >= now), g.Count(e => e.StartAt < now)))
            .OrderBy(r => r.FacilityName)
            .ToList();
    }

    public async Task<IReadOnlyList<CoworkingDeskUtilizationRowDto>> CoworkingDeskUtilizationAsync(CancellationToken ct = default)
    {
        var desks = await _db.Desks.ToListAsync(ct);
        if (desks.Count == 0) return [];

        var spaceFacility = await _db.Spaces.Where(s => desks.Select(d => d.SpaceId).Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.FacilityId, ct);
        var facilityNames = await _db.Facilities.Where(f => spaceFacility.Values.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return desks
            .GroupBy(d => spaceFacility.GetValueOrDefault(d.SpaceId))
            .Where(g => g.Key != Guid.Empty)
            .Select(g => new CoworkingDeskUtilizationRowDto(
                g.Key, facilityNames.GetValueOrDefault(g.Key, ""), g.Count(), g.Count(d => d.Status == DeskStatus.Occupied),
                g.Count() == 0 ? 0 : Math.Round(g.Count(d => d.Status == DeskStatus.Occupied) * 100m / g.Count(), 1)))
            .OrderBy(r => r.FacilityName)
            .ToList();
    }

    public async Task<IReadOnlyList<MeetingRoomUtilizationRowDto>> MeetingRoomUtilizationAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);
        var fromUtc = new DateTimeOffset(resolvedFrom.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toUtc = new DateTimeOffset(resolvedTo.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var bookings = await _db.CoworkingBookings
            .Where(b => b.ResourceType == BookingResourceType.MeetingRoom
                        && b.StartAt >= fromUtc && b.StartAt <= toUtc
                        && (b.Status == CoworkingBookingStatus.Confirmed || b.Status == CoworkingBookingStatus.Completed))
            .ToListAsync(ct);
        if (bookings.Count == 0) return [];

        var rooms = await _db.MeetingRooms.Where(r => bookings.Select(b => b.ResourceId).Contains(r.Id)).ToDictionaryAsync(r => r.Id, ct);
        var spaceFacility = await _db.Spaces.Where(s => rooms.Values.Select(r => r.SpaceId).Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.FacilityId, ct);
        var facilityNames = await _db.Facilities.Where(f => spaceFacility.Values.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return bookings
            .Where(b => rooms.ContainsKey(b.ResourceId))
            .GroupBy(b => b.ResourceId)
            .Select(g =>
            {
                var room = rooms[g.Key];
                var facilityId = spaceFacility.GetValueOrDefault(room.SpaceId);
                return new MeetingRoomUtilizationRowDto(
                    g.Key, room.Name, facilityId, facilityNames.GetValueOrDefault(facilityId, ""),
                    Math.Round((decimal)g.Sum(b => (b.EndAt - b.StartAt).TotalHours), 1), g.Count());
            })
            .OrderByDescending(r => r.BookedHours)
            .ToList();
    }

    public async Task<IReadOnlyList<BookingTrendRowDto>> BookingTrendsAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);
        var fromUtc = new DateTimeOffset(resolvedFrom.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toUtc = new DateTimeOffset(resolvedTo.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var bookings = await _db.CoworkingBookings
            .Where(b => b.StartAt >= fromUtc && b.StartAt <= toUtc && b.Status != CoworkingBookingStatus.Cancelled)
            .Select(b => b.StartAt)
            .ToListAsync(ct);

        return bookings
            .GroupBy(s => DateOnly.FromDateTime(s.UtcDateTime))
            .Select(g => new BookingTrendRowDto(g.Key, g.Count()))
            .OrderBy(r => r.Date)
            .ToList();
    }

    public async Task<IReadOnlyList<MaintenanceBacklogRowDto>> MaintenanceBacklogAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var openStatuses = new[] { MaintenanceStatus.Open, MaintenanceStatus.Assigned, MaintenanceStatus.InProgress, MaintenanceStatus.OnHold };

        var requests = await _db.MaintenanceRequests
            .Where(m => m.FacilityId != null && openStatuses.Contains(m.Status))
            .ToListAsync(ct);
        if (requests.Count == 0) return [];

        var facilityNames = await _db.Facilities.Where(f => requests.Select(r => r.FacilityId).Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.Name, ct);
        var vendorIds = requests.Where(r => r.AssignedVendorId.HasValue).Select(r => r.AssignedVendorId!.Value).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        return requests.Select(r => new MaintenanceBacklogRowDto(
                r.Id, r.RequestNumber, r.FacilityId, r.FacilityId.HasValue ? facilityNames.GetValueOrDefault(r.FacilityId.Value, "") : "",
                r.Priority, r.Status, today.DayNumber - r.ReportedDate.DayNumber,
                r.AssignedVendorId, r.AssignedVendorId.HasValue ? vendorNames.GetValueOrDefault(r.AssignedVendorId.Value) : null))
            .OrderByDescending(r => r.AgeInDays)
            .ToList();
    }
}
