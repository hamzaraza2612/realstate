using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Units;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class PropertyUnitService : IPropertyUnitService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public PropertyUnitService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<PropertyUnitDto>> ListAsync(PagedRequest request, PropertyUnitFilter filter, CancellationToken ct = default)
    {
        var query = _db.PropertyUnits.AsQueryable();
        if (filter.PropertyId.HasValue) query = query.Where(u => u.PropertyId == filter.PropertyId);
        if (filter.Type.HasValue) query = query.Where(u => u.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(u => u.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(u => u.UnitNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var units = await query.OrderByDescending(u => u.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<PropertyUnitDto>(await ToDtosAsync(units, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<PropertyUnitDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<PropertyUnitDto>("Unit not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result<PropertyUnitDto>> CreateAsync(CreatePropertyUnitRequest request, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == request.PropertyId, ct);
        if (property is null) return Result.Failure<PropertyUnitDto>("Property not found.", "not_found");

        var duplicate = await _db.PropertyUnits.AnyAsync(u => u.PropertyId == request.PropertyId && u.UnitNumber == request.UnitNumber, ct);
        if (duplicate) return Result.Failure<PropertyUnitDto>("A unit with this number already exists for this property.", "duplicate_unit_number");

        var unit = new PropertyUnit
        {
            PropertyId = request.PropertyId,
            BuildingBlock = request.BuildingBlock,
            UnitNumber = request.UnitNumber,
            Type = request.Type,
            Floor = request.Floor,
            AreaSize = request.AreaSize,
            AreaUnit = request.AreaUnit,
            Bedrooms = request.Bedrooms,
            MarketRentRate = request.MarketRentRate,
            MetadataJson = request.MetadataJson
        };
        _db.PropertyUnits.Add(unit);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Property", "PropertyUnit", unit.Id.ToString(), after: new { unit.UnitNumber, unit.PropertyId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result<PropertyUnitDto>> UpdateAsync(Guid id, UpdatePropertyUnitRequest request, CancellationToken ct = default)
    {
        var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<PropertyUnitDto>("Unit not found.", "not_found");

        var duplicate = await _db.PropertyUnits.AnyAsync(u => u.PropertyId == unit.PropertyId && u.UnitNumber == request.UnitNumber && u.Id != id, ct);
        if (duplicate) return Result.Failure<PropertyUnitDto>("A unit with this number already exists for this property.", "duplicate_unit_number");

        unit.BuildingBlock = request.BuildingBlock;
        unit.UnitNumber = request.UnitNumber;
        unit.Type = request.Type;
        unit.Floor = request.Floor;
        unit.AreaSize = request.AreaSize;
        unit.AreaUnit = request.AreaUnit;
        unit.Bedrooms = request.Bedrooms;
        unit.MarketRentRate = request.MarketRentRate;
        unit.MetadataJson = request.MetadataJson;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Property", "PropertyUnit", unit.Id.ToString(), after: new { unit.UnitNumber }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result<PropertyUnitDto>> ChangeStatusAsync(Guid id, ChangePropertyUnitStatusRequest request, CancellationToken ct = default)
    {
        var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<PropertyUnitDto>("Unit not found.", "not_found");

        if (unit.Status == PropertyUnitStatus.Occupied || request.Status == PropertyUnitStatus.Occupied)
        {
            return Result.Failure<PropertyUnitDto>("Occupied is only set/cleared automatically by lease activation/termination, not a manual transition.", "invalid_transition");
        }

        if (!PropertyUnitStatusRules.CanTransition(unit.Status, request.Status))
            return Result.Failure<PropertyUnitDto>($"Cannot transition unit from {unit.Status} to {request.Status}.", "invalid_transition");

        unit.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("StatusChange", "Property", "PropertyUnit", unit.Id.ToString(), after: new { unit.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure("Unit not found.", "not_found");

        var hasLeases = await _db.Leases.AnyAsync(l => l.UnitId == id, ct);
        if (hasLeases) return Result.Failure("This unit has lease history and cannot be deleted.", "has_dependents");

        _db.PropertyUnits.Remove(unit);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Property", "PropertyUnit", id.ToString(), ct: ct);
        return Result.Success();
    }

    private async Task<List<PropertyUnitDto>> ToDtosAsync(IReadOnlyCollection<PropertyUnit> units, CancellationToken ct)
    {
        var propertyIds = units.Select(u => u.PropertyId).Distinct().ToList();
        var propertyNames = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return units.Select(u => new PropertyUnitDto(
            u.Id, u.PropertyId, propertyNames.GetValueOrDefault(u.PropertyId, ""), u.BuildingBlock, u.UnitNumber, u.Type, u.Floor,
            u.AreaSize, u.AreaUnit, u.Bedrooms, u.Status, u.MarketRentRate, u.MetadataJson, u.CreatedAt, u.UpdatedAt)).ToList();
    }
}
