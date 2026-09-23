using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Owners;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class PropertyOwnerService : IPropertyOwnerService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public PropertyOwnerService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<PropertyOwnerDto>> ListAsync(PagedRequest request, PropertyOwnerFilter filter, CancellationToken ct = default)
    {
        var query = _db.PropertyOwners.AsQueryable();
        if (filter.IsActive.HasValue) query = query.Where(o => o.IsActive == filter.IsActive);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(o => o.FullName.ToLower().Contains(s) || (o.Email != null && o.Email.ToLower().Contains(s)));
        }

        var owners = await query.OrderBy(o => o.FullName).ToListAsync(ct);
        var total = owners.Count;
        var page = owners.Skip(request.Skip).Take(request.PageSize).ToList();

        var propertyCounts = await _db.Properties
            .Where(p => p.PropertyOwnerId != null && page.Select(o => o.Id).Contains(p.PropertyOwnerId!.Value))
            .GroupBy(p => p.PropertyOwnerId!.Value)
            .Select(g => new { OwnerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OwnerId, x => x.Count, ct);

        var dtos = page.Select(o => ToDto(o, propertyCounts.GetValueOrDefault(o.Id))).ToList();
        return new PagedResult<PropertyOwnerDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<PropertyOwnerDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var owner = await _db.PropertyOwners.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (owner is null) return Result.Failure<PropertyOwnerDto>("Property owner not found.", "not_found");

        var count = await _db.Properties.CountAsync(p => p.PropertyOwnerId == id, ct);
        return Result.Success(ToDto(owner, count));
    }

    public async Task<Result<PropertyOwnerDto>> CreateAsync(CreatePropertyOwnerRequest request, CancellationToken ct = default)
    {
        var owner = new PropertyOwner
        {
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Notes = request.Notes
        };
        _db.PropertyOwners.Add(owner);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Property", "PropertyOwner", owner.Id.ToString(), after: new { owner.FullName }, ct: ct);

        return Result.Success(ToDto(owner, 0));
    }

    public async Task<Result<PropertyOwnerDto>> UpdateAsync(Guid id, UpdatePropertyOwnerRequest request, CancellationToken ct = default)
    {
        var owner = await _db.PropertyOwners.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (owner is null) return Result.Failure<PropertyOwnerDto>("Property owner not found.", "not_found");

        var before = new { owner.FullName, owner.Email, owner.Phone, owner.IsActive };
        owner.FullName = request.FullName;
        owner.Email = request.Email;
        owner.Phone = request.Phone;
        owner.Notes = request.Notes;
        owner.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Property", "PropertyOwner", owner.Id.ToString(), before: before, after: new { owner.FullName, owner.Email, owner.Phone, owner.IsActive }, ct: ct);

        var count = await _db.Properties.CountAsync(p => p.PropertyOwnerId == id, ct);
        return Result.Success(ToDto(owner, count));
    }

    public async Task<Result> LinkPropertyAsync(Guid propertyId, Guid? ownerId, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == propertyId, ct);
        if (property is null) return Result.Failure("Property not found.", "not_found");

        if (ownerId.HasValue)
        {
            var ownerExists = await _db.PropertyOwners.AnyAsync(o => o.Id == ownerId, ct);
            if (!ownerExists) return Result.Failure("Property owner not found.", "owner_not_found");
        }

        property.PropertyOwnerId = ownerId;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("LinkOwner", "Property", "Property", property.Id.ToString(), after: new { property.PropertyOwnerId }, ct: ct);
        return Result.Success();
    }

    private static PropertyOwnerDto ToDto(PropertyOwner owner, int propertyCount) =>
        new(owner.Id, owner.FullName, owner.Email, owner.Phone, owner.Notes, owner.IsActive, propertyCount);
}
