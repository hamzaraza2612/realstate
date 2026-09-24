using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Facilities;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;
using FacilityEntity = RealEstateErp.Domain.Facility.Facility;

namespace RealEstateErp.Infrastructure.Services.Facility;

public class FacilityService : IFacilityService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public FacilityService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<FacilityDto>> ListAsync(PagedRequest request, FacilityFilter filter, CancellationToken ct = default)
    {
        var query = _db.Facilities.AsQueryable();
        if (filter.Type.HasValue) query = query.Where(f => f.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(f => f.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(f => f.Name.ToLower().Contains(s) || f.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var facilities = await query.OrderByDescending(f => f.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<FacilityDto>(await ToDtosAsync(facilities, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<FacilityDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (facility is null) return Result.Failure<FacilityDto>("Facility not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { facility }, ct))[0]);
    }

    public async Task<Result<FacilityDto>> CreateAsync(CreateFacilityRequest request, CancellationToken ct = default)
    {
        var codeExists = await _db.Facilities.AnyAsync(f => f.Code == request.Code, ct);
        if (codeExists) return Result.Failure<FacilityDto>("A facility with this code already exists.", "duplicate_code");

        var propertyExists = await _db.Properties.AnyAsync(p => p.Id == request.PropertyId, ct);
        if (!propertyExists) return Result.Failure<FacilityDto>("Property not found.", "not_found");

        var facility = new FacilityEntity
        {
            Code = request.Code,
            PropertyId = request.PropertyId,
            Type = request.Type,
            Name = request.Name,
            Description = request.Description,
            AddressLine = request.AddressLine,
            City = request.City,
            ManagerUserId = request.ManagerUserId
        };
        _db.Facilities.Add(facility);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "Facility", facility.Id.ToString(), after: new { facility.Code, facility.Name, facility.Type }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { facility }, ct))[0]);
    }

    public async Task<Result<FacilityDto>> UpdateAsync(Guid id, UpdateFacilityRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (facility is null) return Result.Failure<FacilityDto>("Facility not found.", "not_found");

        facility.Name = request.Name;
        facility.Status = request.Status;
        facility.Description = request.Description;
        facility.AddressLine = request.AddressLine;
        facility.City = request.City;
        facility.ManagerUserId = request.ManagerUserId;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Facility", "Facility", facility.Id.ToString(), after: new { facility.Name, facility.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { facility }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (facility is null) return Result.Failure("Facility not found.", "not_found");

        var hasSpaces = await _db.Spaces.AnyAsync(s => s.FacilityId == id, ct);
        if (hasSpaces) return Result.Failure("This facility still has spaces and cannot be deleted.", "has_dependents");

        _db.Facilities.Remove(facility);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Facility", "Facility", id.ToString(), ct: ct);
        return Result.Success();
    }

    private async Task<List<FacilityDto>> ToDtosAsync(IReadOnlyCollection<FacilityEntity> facilities, CancellationToken ct)
    {
        var propertyIds = facilities.Select(f => f.PropertyId).Distinct().ToList();
        var propertyNames = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var ids = facilities.Select(f => f.Id).ToList();
        var spaceCounts = await _db.Spaces.Where(s => ids.Contains(s.FacilityId))
            .GroupBy(s => s.FacilityId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(g => g.Key, g => g.Count, ct);
        var managerIds = facilities.Where(f => f.ManagerUserId.HasValue).Select(f => f.ManagerUserId!.Value).Distinct().ToList();
        var managerNames = await _db.Users.Where(u => managerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return facilities.Select(f => new FacilityDto(
            f.Id, f.Code, f.PropertyId, propertyNames.GetValueOrDefault(f.PropertyId, ""), f.Type, f.Name, f.Status,
            f.Description, f.AddressLine, f.City, f.ManagerUserId, f.ManagerUserId.HasValue ? managerNames.GetValueOrDefault(f.ManagerUserId.Value) : null,
            spaceCounts.GetValueOrDefault(f.Id, 0), f.CreatedAt, f.UpdatedAt)).ToList();
    }
}
