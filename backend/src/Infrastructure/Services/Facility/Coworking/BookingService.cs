using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class BookingService : IBookingService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public BookingService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<BookingDto>> ListAsync(PagedRequest request, BookingFilter filter, CancellationToken ct = default)
    {
        var query = _db.CoworkingBookings.AsQueryable();
        if (filter.MemberId.HasValue) query = query.Where(b => b.MemberId == filter.MemberId);
        if (filter.ResourceType.HasValue) query = query.Where(b => b.ResourceType == filter.ResourceType);
        if (filter.ResourceId.HasValue) query = query.Where(b => b.ResourceId == filter.ResourceId);
        if (filter.Status.HasValue) query = query.Where(b => b.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var bookings = await query.OrderByDescending(b => b.StartAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<BookingDto>(await ToDtosAsync(bookings, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<BookingDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var booking = await _db.CoworkingBookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    public async Task<Result<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct = default)
    {
        var memberExists = await _db.CoworkingMembers.AnyAsync(m => m.Id == request.MemberId, ct);
        if (!memberExists) return Result.Failure<BookingDto>("Member not found.", "not_found");

        decimal price;
        if (request.ResourceType == BookingResourceType.Desk)
        {
            var desk = await _db.Desks.FirstOrDefaultAsync(d => d.Id == request.ResourceId, ct);
            if (desk is null) return Result.Failure<BookingDto>("Desk not found.", "not_found");
            var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == desk.SpaceId, ct);
            var hours = (decimal)(request.EndAt - request.StartAt).TotalHours;
            price = Math.Round(hours * (space?.Rate ?? 0), 2);
        }
        else
        {
            var room = await _db.MeetingRooms.FirstOrDefaultAsync(r => r.Id == request.ResourceId, ct);
            if (room is null) return Result.Failure<BookingDto>("Meeting room not found.", "not_found");
            var hours = (decimal)(request.EndAt - request.StartAt).TotalHours;
            var hourlyRate = room.HourlyRate ?? (room.DailyRate.HasValue ? room.DailyRate.Value / 24 : 0);
            price = Math.Round(hours * hourlyRate, 2);
        }

        var overlapping = await _db.CoworkingBookings.AnyAsync(
            b => b.ResourceType == request.ResourceType && b.ResourceId == request.ResourceId && b.Status != BookingStatus.Cancelled
                 && b.StartAt < request.EndAt && b.EndAt > request.StartAt, ct);
        if (overlapping) return Result.Failure<BookingDto>("This resource is already booked for an overlapping time range.", "overlapping_booking");

        try
        {
            var booking = new Booking
            {
                MemberId = request.MemberId,
                ResourceType = request.ResourceType,
                ResourceId = request.ResourceId,
                StartAt = request.StartAt,
                EndAt = request.EndAt,
                Price = price,
                Notes = request.Notes
            };
            _db.CoworkingBookings.Add(booking);
            await _db.SaveChangesAsync(ct);

            await _auditLogger.LogAsync("Create", "Facility", "Booking", booking.Id.ToString(), after: new { booking.ResourceType, booking.ResourceId, booking.Price }, ct: ct);

            return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23P01" })
        {
            _db.ChangeTracker.Clear();
            return Result.Failure<BookingDto>("This resource is already booked for an overlapping time range.", "overlapping_booking");
        }
    }

    public async Task<Result<BookingDto>> ChangeStatusAsync(Guid id, ChangeBookingStatusRequest request, CancellationToken ct = default)
    {
        var booking = await _db.CoworkingBookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        if (!BookingStatusRules.CanTransition(booking.Status, request.Status))
            return Result.Failure<BookingDto>($"Cannot transition booking from {booking.Status} to {request.Status}.", "invalid_transition");

        var before = booking.Status;
        booking.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Facility", "Booking", booking.Id.ToString(), new { Status = before }, new { booking.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    private async Task<List<BookingDto>> ToDtosAsync(IReadOnlyCollection<Booking> bookings, CancellationToken ct)
    {
        var memberIds = bookings.Select(b => b.MemberId).Distinct().ToList();
        var members = await _db.CoworkingMembers.Where(m => memberIds.Contains(m.Id)).ToListAsync(ct);
        var customerIds = members.Select(m => m.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var memberNames = members.ToDictionary(m => m.Id, m => customerNames.GetValueOrDefault(m.CustomerId, ""));

        var deskIds = bookings.Where(b => b.ResourceType == BookingResourceType.Desk).Select(b => b.ResourceId).Distinct().ToList();
        var deskCodes = await _db.Desks.Where(d => deskIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Code, ct);
        var roomIds = bookings.Where(b => b.ResourceType == BookingResourceType.MeetingRoom).Select(b => b.ResourceId).Distinct().ToList();
        var roomNames = await _db.MeetingRooms.Where(r => roomIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r.Name, ct);

        return bookings.Select(b => new BookingDto(
            b.Id, b.MemberId, memberNames.GetValueOrDefault(b.MemberId, ""), b.ResourceType, b.ResourceId,
            b.ResourceType == BookingResourceType.Desk ? deskCodes.GetValueOrDefault(b.ResourceId, "") : roomNames.GetValueOrDefault(b.ResourceId, ""),
            b.StartAt, b.EndAt, b.Status, b.Price, b.PaidAmount, b.Notes, b.CreatedAt)).ToList();
    }
}
