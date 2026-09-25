using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Properties;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;
using PropertyEntity = RealEstateErp.Domain.Property.Property;

namespace RealEstateErp.Infrastructure.Services.Property;

public class PropertyService : IPropertyService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;
    private readonly ITenantContext _tenantContext;
    private readonly ITenantEntitlementService _entitlements;

    public PropertyService(AppDbContext db, IAuditLogger auditLogger, ITenantContext tenantContext, ITenantEntitlementService entitlements)
    {
        _db = db;
        _auditLogger = auditLogger;
        _tenantContext = tenantContext;
        _entitlements = entitlements;
    }

    public async Task<PagedResult<PropertyDto>> ListAsync(PagedRequest request, PropertyFilter filter, CancellationToken ct = default)
    {
        var query = _db.Properties.AsQueryable();
        if (filter.Type.HasValue) query = query.Where(p => p.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var properties = await query.OrderByDescending(p => p.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<PropertyDto>(await ToDtosAsync(properties, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<PropertyDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (property is null) return Result.Failure<PropertyDto>("Property not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { property }, ct))[0]);
    }

    public async Task<Result<PropertyDto>> CreateAsync(CreatePropertyRequest request, CancellationToken ct = default)
    {
        var codeExists = await _db.Properties.AnyAsync(p => p.Code == request.Code, ct);
        if (codeExists) return Result.Failure<PropertyDto>("A property with this code already exists.", "duplicate_code");

        if (_tenantContext.TenantId is { } tenantId)
        {
            var limit = await _entitlements.GetLimitAsync(tenantId, EntitlementCodes.MaxProperties, ct);
            if (limit.HasValue)
            {
                var currentProperties = await _db.Properties.CountAsync(ct);
                if (currentProperties >= limit.Value)
                {
                    return Result.Failure<PropertyDto>("This organization has reached its plan's property limit.", "limit_exceeded");
                }
            }
        }

        var property = new PropertyEntity
        {
            Code = request.Code,
            Name = request.Name,
            Type = request.Type,
            Description = request.Description,
            AddressLine = request.AddressLine,
            City = request.City,
            State = request.State,
            Country = request.Country,
            PostalCode = request.PostalCode,
            OwnerName = request.OwnerName,
            OwnerContact = request.OwnerContact
        };
        _db.Properties.Add(property);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Property", "Property", property.Id.ToString(),
            after: new { property.Code, property.Name, property.Type }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { property }, ct))[0]);
    }

    public async Task<Result<PropertyDto>> UpdateAsync(Guid id, UpdatePropertyRequest request, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (property is null) return Result.Failure<PropertyDto>("Property not found.", "not_found");

        property.Name = request.Name;
        property.Status = request.Status;
        property.Description = request.Description;
        property.AddressLine = request.AddressLine;
        property.City = request.City;
        property.State = request.State;
        property.Country = request.Country;
        property.PostalCode = request.PostalCode;
        property.OwnerName = request.OwnerName;
        property.OwnerContact = request.OwnerContact;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Property", "Property", property.Id.ToString(), after: new { property.Name, property.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { property }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (property is null) return Result.Failure("Property not found.", "not_found");

        var hasUnits = await _db.PropertyUnits.AnyAsync(u => u.PropertyId == id, ct);
        if (hasUnits) return Result.Failure("This property still has units and cannot be deleted.", "has_dependents");

        _db.Properties.Remove(property);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Property", "Property", id.ToString(), ct: ct);
        return Result.Success();
    }

    private async Task<List<PropertyDto>> ToDtosAsync(IReadOnlyCollection<PropertyEntity> properties, CancellationToken ct)
    {
        var ids = properties.Select(p => p.Id).ToList();
        var unitCounts = await _db.PropertyUnits.Where(u => ids.Contains(u.PropertyId))
            .GroupBy(u => u.PropertyId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(g => g.Key, g => g.Count, ct);

        return properties.Select(p => new PropertyDto(
            p.Id, p.Code, p.Name, p.Type, p.Status, p.Description, p.AddressLine, p.City, p.State, p.Country, p.PostalCode,
            p.OwnerName, p.OwnerContact, unitCounts.GetValueOrDefault(p.Id, 0), p.CreatedAt, p.UpdatedAt)).ToList();
    }
}
