using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Spaces;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility;

public class SpaceService : ISpaceService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public SpaceService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<SpaceDto>> ListAsync(PagedRequest request, SpaceFilter filter, CancellationToken ct = default)
    {
        var query = _db.Spaces.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(s => s.FacilityId == filter.FacilityId);
        if (filter.Type.HasValue) query = query.Where(s => s.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(s => s.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s2 = filter.Search.ToLowerInvariant();
            query = query.Where(s => s.Code.ToLower().Contains(s2));
        }

        var total = await query.CountAsync(ct);
        var spaces = await query.OrderByDescending(s => s.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<SpaceDto>(await ToDtosAsync(spaces, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<SpaceDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (space is null) return Result.Failure<SpaceDto>("Space not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result<SpaceDto>> CreateAsync(CreateSpaceRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<SpaceDto>("Facility not found.", "not_found");

        var duplicate = await _db.Spaces.AnyAsync(s => s.FacilityId == request.FacilityId && s.Code == request.Code, ct);
        if (duplicate) return Result.Failure<SpaceDto>("A space with this code already exists for this facility.", "duplicate_code");

        if (request.PropertyUnitId.HasValue)
        {
            var unitExists = await _db.PropertyUnits.AnyAsync(u => u.Id == request.PropertyUnitId, ct);
            if (!unitExists) return Result.Failure<SpaceDto>("Property unit not found.", "not_found");
        }

        var space = new Space
        {
            FacilityId = request.FacilityId,
            PropertyUnitId = request.PropertyUnitId,
            BuildingBlock = request.BuildingBlock,
            Code = request.Code,
            Type = request.Type,
            AreaSize = request.AreaSize,
            Capacity = request.Capacity,
            Rate = request.Rate,
            MetadataJson = request.MetadataJson
        };
        _db.Spaces.Add(space);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "Space", space.Id.ToString(), after: new { space.Code, space.FacilityId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result<SpaceDto>> UpdateAsync(Guid id, UpdateSpaceRequest request, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (space is null) return Result.Failure<SpaceDto>("Space not found.", "not_found");

        var duplicate = await _db.Spaces.AnyAsync(s => s.FacilityId == space.FacilityId && s.Code == request.Code && s.Id != id, ct);
        if (duplicate) return Result.Failure<SpaceDto>("A space with this code already exists for this facility.", "duplicate_code");

        space.BuildingBlock = request.BuildingBlock;
        space.Code = request.Code;
        space.Type = request.Type;
        space.AreaSize = request.AreaSize;
        space.Capacity = request.Capacity;
        space.Rate = request.Rate;
        space.MetadataJson = request.MetadataJson;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Facility", "Space", space.Id.ToString(), after: new { space.Code }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result<SpaceDto>> ChangeStatusAsync(Guid id, ChangeSpaceStatusRequest request, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (space is null) return Result.Failure<SpaceDto>("Space not found.", "not_found");

        if (space.Status == SpaceStatus.Occupied || request.Status == SpaceStatus.Occupied)
        {
            return Result.Failure<SpaceDto>("Occupied is only set/cleared automatically by a lease or desk/booking assignment, not a manual transition.", "invalid_transition");
        }

        if (!SpaceStatusRules.CanTransition(space.Status, request.Status))
            return Result.Failure<SpaceDto>($"Cannot transition space from {space.Status} to {request.Status}.", "invalid_transition");

        space.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("StatusChange", "Facility", "Space", space.Id.ToString(), after: new { space.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (space is null) return Result.Failure("Space not found.", "not_found");

        var hasDesks = await _db.Desks.AnyAsync(d => d.SpaceId == id, ct);
        var hasRooms = await _db.MeetingRooms.AnyAsync(r => r.SpaceId == id, ct);
        if (hasDesks || hasRooms) return Result.Failure("This space still has desks or meeting rooms and cannot be deleted.", "has_dependents");

        _db.Spaces.Remove(space);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Facility", "Space", id.ToString(), ct: ct);
        return Result.Success();
    }

    private async Task<List<SpaceDto>> ToDtosAsync(IReadOnlyCollection<Space> spaces, CancellationToken ct)
    {
        var facilityIds = spaces.Select(s => s.FacilityId).Distinct().ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        return spaces.Select(s => new SpaceDto(
            s.Id, s.FacilityId, facilityNames.GetValueOrDefault(s.FacilityId, ""), s.PropertyUnitId, s.BuildingBlock, s.Code,
            s.Type, s.AreaSize, s.Capacity, s.Status, s.Rate, s.MetadataJson, s.CreatedAt, s.UpdatedAt)).ToList();
    }
}
