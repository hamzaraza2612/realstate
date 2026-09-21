using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class MeetingRoomService : IMeetingRoomService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MeetingRoomService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MeetingRoomDto>> ListAsync(PagedRequest request, MeetingRoomFilter filter, CancellationToken ct = default)
    {
        var query = _db.MeetingRooms.AsQueryable();
        if (filter.SpaceId.HasValue) query = query.Where(r => r.SpaceId == filter.SpaceId);
        if (filter.Status.HasValue) query = query.Where(r => r.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var rooms = await query.OrderBy(r => r.Name).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var spaceCodes = await _db.Spaces.Where(s => rooms.Select(r => r.SpaceId).Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Code, ct);

        var dtos = rooms.Select(r => new MeetingRoomDto(r.Id, r.SpaceId, spaceCodes.GetValueOrDefault(r.SpaceId, ""), r.Name, r.Capacity, r.HourlyRate, r.DailyRate, r.Status)).ToList();
        return new PagedResult<MeetingRoomDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<MeetingRoomDto>> CreateAsync(CreateMeetingRoomRequest request, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == request.SpaceId, ct);
        if (space is null) return Result.Failure<MeetingRoomDto>("Space not found.", "not_found");

        var room = new MeetingRoom { SpaceId = request.SpaceId, Name = request.Name, Capacity = request.Capacity, HourlyRate = request.HourlyRate, DailyRate = request.DailyRate };
        _db.MeetingRooms.Add(room);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "MeetingRoom", room.Id.ToString(), after: new { room.Name, room.SpaceId }, ct: ct);

        return Result.Success(new MeetingRoomDto(room.Id, room.SpaceId, space.Code, room.Name, room.Capacity, room.HourlyRate, room.DailyRate, room.Status));
    }

    public async Task<Result<MeetingRoomDto>> UpdateAsync(Guid id, UpdateMeetingRoomRequest request, CancellationToken ct = default)
    {
        var room = await _db.MeetingRooms.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (room is null) return Result.Failure<MeetingRoomDto>("Meeting room not found.", "not_found");

        room.Name = request.Name;
        room.Capacity = request.Capacity;
        room.HourlyRate = request.HourlyRate;
        room.DailyRate = request.DailyRate;
        room.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        var space = await _db.Spaces.FirstAsync(s => s.Id == room.SpaceId, ct);
        await _auditLogger.LogAsync("Update", "Facility", "MeetingRoom", room.Id.ToString(), after: new { room.Name, room.Status }, ct: ct);

        return Result.Success(new MeetingRoomDto(room.Id, room.SpaceId, space.Code, room.Name, room.Capacity, room.HourlyRate, room.DailyRate, room.Status));
    }
}
