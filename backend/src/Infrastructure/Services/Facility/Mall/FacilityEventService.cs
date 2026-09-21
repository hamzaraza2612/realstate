using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class FacilityEventService : IFacilityEventService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public FacilityEventService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<FacilityEventDto>> ListAsync(PagedRequest request, FacilityEventFilter filter, CancellationToken ct = default)
    {
        var query = _db.FacilityEvents.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(e => e.FacilityId == filter.FacilityId);
        if (filter.Status.HasValue) query = query.Where(e => e.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var events = await query.OrderBy(e => e.StartAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var facilityNames = await _db.Facilities.Where(f => events.Select(e => e.FacilityId).Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        var dtos = events.Select(e => new FacilityEventDto(
            e.Id, e.FacilityId, facilityNames.GetValueOrDefault(e.FacilityId, ""), e.Title, e.StartAt, e.EndAt, e.Location, e.Organizer, e.Status, e.Notes)).ToList();
        return new PagedResult<FacilityEventDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<FacilityEventDto>> CreateAsync(CreateFacilityEventRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<FacilityEventDto>("Facility not found.", "not_found");

        var evt = new FacilityEvent
        {
            FacilityId = request.FacilityId,
            Title = request.Title,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            Location = request.Location,
            Organizer = request.Organizer,
            Notes = request.Notes
        };
        _db.FacilityEvents.Add(evt);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "FacilityEvent", evt.Id.ToString(), after: new { evt.Title, evt.FacilityId }, ct: ct);

        return Result.Success(new FacilityEventDto(evt.Id, evt.FacilityId, facility.Name, evt.Title, evt.StartAt, evt.EndAt, evt.Location, evt.Organizer, evt.Status, evt.Notes));
    }

    public async Task<Result<FacilityEventDto>> ChangeStatusAsync(Guid id, ChangeFacilityEventStatusRequest request, CancellationToken ct = default)
    {
        var evt = await _db.FacilityEvents.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (evt is null) return Result.Failure<FacilityEventDto>("Event not found.", "not_found");

        evt.Status = request.Status;
        await _db.SaveChangesAsync(ct);
        var facility = await _db.Facilities.FirstAsync(f => f.Id == evt.FacilityId, ct);

        await _auditLogger.LogAsync("ChangeStatus", "Facility", "FacilityEvent", evt.Id.ToString(), after: new { evt.Status }, ct: ct);

        return Result.Success(new FacilityEventDto(evt.Id, evt.FacilityId, facility.Name, evt.Title, evt.StartAt, evt.EndAt, evt.Location, evt.Organizer, evt.Status, evt.Notes));
    }
}
