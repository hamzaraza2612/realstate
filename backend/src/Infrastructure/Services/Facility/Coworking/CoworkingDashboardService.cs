using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class CoworkingDashboardService : ICoworkingDashboardService
{
    private readonly AppDbContext _db;

    public CoworkingDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CoworkingDashboardDto> GetAsync(Guid? facilityId, CancellationToken ct = default)
    {
        var coworkingFacilityIds = facilityId.HasValue
            ? new List<Guid> { facilityId.Value }
            : await _db.Facilities.Where(f => f.Type == FacilityType.Coworking).Select(f => f.Id).ToListAsync(ct);

        var spaceIds = await _db.Spaces.Where(s => coworkingFacilityIds.Contains(s.FacilityId)).Select(s => s.Id).ToListAsync(ct);
        var desks = await _db.Desks.Where(d => spaceIds.Contains(d.SpaceId)).ToListAsync(ct);
        var totalDesks = desks.Count;
        var occupiedDesks = desks.Count(d => d.Status == DeskStatus.Occupied);
        var availableDesks = desks.Count(d => d.Status == DeskStatus.Available);
        var occupancy = totalDesks == 0 ? 0 : Math.Round((decimal)occupiedDesks / totalDesks * 100, 2);

        var members = await _db.CoworkingMembers.ToListAsync(ct);
        var memberIds = members.Select(m => m.Id).ToList();
        var activeMemberships = await _db.Memberships.Where(m => memberIds.Contains(m.MemberId) && m.Status == MembershipStatus.Active).ToListAsync(ct);
        var activeMembers = activeMemberships.Select(m => m.MemberId).Distinct().Count();

        var membershipRevenue = await _db.FacilityPayments
            .Where(p => p.SourceType == FacilityPaymentSourceType.CoworkingMembership)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var roomIds = await _db.MeetingRooms.Where(r => spaceIds.Contains(r.SpaceId)).Select(r => r.Id).ToListAsync(ct);
        var roomBookings = await _db.CoworkingBookings.Where(b => b.ResourceType == BookingResourceType.MeetingRoom && roomIds.Contains(b.ResourceId)).ToListAsync(ct);
        var meetingRoomBookings = roomBookings.Count(b => b.Status != BookingStatus.Cancelled);

        var now = DateTimeOffset.UtcNow;
        var deskIds = desks.Select(d => d.Id).ToList();
        var allBookings = await _db.CoworkingBookings
            .Where(b => b.Status != BookingStatus.Cancelled && ((b.ResourceType == BookingResourceType.Desk && deskIds.Contains(b.ResourceId)) || (b.ResourceType == BookingResourceType.MeetingRoom && roomIds.Contains(b.ResourceId))))
            .ToListAsync(ct);

        var upcoming = allBookings.Where(b => b.StartAt >= now).OrderBy(b => b.StartAt).Take(10).ToList();
        var memberNames = await GetMemberNamesAsync(upcoming.Select(b => b.MemberId).Distinct().ToList(), ct);
        var deskCodes = await _db.Desks.Where(d => deskIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Code, ct);
        var roomNames = await _db.MeetingRooms.Where(r => roomIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r.Name, ct);

        var upcomingBookings = upcoming.Select(b => new UpcomingBookingDto(
            b.Id, memberNames.GetValueOrDefault(b.MemberId, ""),
            b.ResourceType == BookingResourceType.Desk ? deskCodes.GetValueOrDefault(b.ResourceId, "") : roomNames.GetValueOrDefault(b.ResourceId, ""),
            b.StartAt, b.EndAt)).ToList();

        var last30Days = now.AddDays(-30);
        var recentBookings = allBookings.Where(b => b.StartAt >= last30Days).ToList();
        var bookedHours = recentBookings.Sum(b => (decimal)(b.EndAt - b.StartAt).TotalHours);
        var capacityHours = (totalDesks + roomIds.Count) * 24m * 30m;
        var utilizationSummary = capacityHours == 0 ? 0 : Math.Round(bookedHours / capacityHours * 100, 2);

        var openRequests = await _db.MaintenanceRequests
            .CountAsync(m => m.FacilityId != null && coworkingFacilityIds.Contains(m.FacilityId.Value) && m.Status != MaintenanceStatus.Resolved && m.Status != MaintenanceStatus.Cancelled, ct);
        openRequests += await _db.FacilityServiceRequests
            .CountAsync(s => coworkingFacilityIds.Contains(s.FacilityId) && s.Status != MaintenanceStatus.Resolved && s.Status != MaintenanceStatus.Cancelled, ct);

        return new CoworkingDashboardDto(
            totalDesks, occupiedDesks, availableDesks, occupancy, activeMembers, membershipRevenue,
            meetingRoomBookings, upcomingBookings, utilizationSummary, openRequests);
    }

    private async Task<Dictionary<Guid, string>> GetMemberNamesAsync(List<Guid> memberIds, CancellationToken ct)
    {
        var members = await _db.CoworkingMembers.Where(m => memberIds.Contains(m.Id)).ToListAsync(ct);
        var customerIds = members.Select(m => m.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        return members.ToDictionary(m => m.Id, m => customerNames.GetValueOrDefault(m.CustomerId, ""));
    }
}
