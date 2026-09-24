using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class MallShopService : IMallShopService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MallShopService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MallShopDto>> ListAsync(PagedRequest request, MallShopFilter filter, CancellationToken ct = default)
    {
        var query = _db.Spaces.Where(s => s.Type == SpaceType.Shop);
        if (filter.FacilityId.HasValue) query = query.Where(s => s.FacilityId == filter.FacilityId);
        if (filter.Status.HasValue) query = query.Where(s => s.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s2 = filter.Search.ToLowerInvariant();
            query = query.Where(s => s.Code.ToLower().Contains(s2));
        }

        var total = await query.CountAsync(ct);
        var spaces = await query.OrderByDescending(s => s.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<MallShopDto>(await ToDtosAsync(spaces, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<MallShopDto>> GetAsync(Guid spaceId, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId && s.Type == SpaceType.Shop, ct);
        if (space is null) return Result.Failure<MallShopDto>("Shop not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result<MallShopDto>> CreateAsync(CreateMallShopRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<MallShopDto>("Facility not found.", "not_found");

        var duplicate = await _db.Spaces.AnyAsync(s => s.FacilityId == request.FacilityId && s.Code == request.Code, ct);
        if (duplicate) return Result.Failure<MallShopDto>("A shop with this code already exists for this facility.", "duplicate_code");

        var unit = new PropertyUnit
        {
            PropertyId = facility.PropertyId,
            BuildingBlock = request.BuildingBlock,
            UnitNumber = request.Code,
            Type = PropertyUnitType.Shop,
            AreaSize = request.AreaSize,
            MarketRentRate = request.Rate
        };
        _db.PropertyUnits.Add(unit);

        var space = new Space
        {
            FacilityId = request.FacilityId,
            PropertyUnitId = unit.Id,
            BuildingBlock = request.BuildingBlock,
            Code = request.Code,
            Type = SpaceType.Shop,
            AreaSize = request.AreaSize,
            Rate = request.Rate
        };
        _db.Spaces.Add(space);

        var profile = new MallShopProfile
        {
            SpaceId = space.Id,
            TradeCategory = request.TradeCategory,
            StorefrontName = request.StorefrontName,
            Notes = request.Notes
        };
        _db.MallShopProfiles.Add(profile);

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "MallShop", space.Id.ToString(), after: new { space.Code, request.FacilityId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    public async Task<Result<MallShopDto>> UpdateAsync(Guid spaceId, UpdateMallShopRequest request, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId && s.Type == SpaceType.Shop, ct);
        if (space is null) return Result.Failure<MallShopDto>("Shop not found.", "not_found");

        var profile = await _db.MallShopProfiles.FirstOrDefaultAsync(p => p.SpaceId == spaceId, ct);
        if (profile is null)
        {
            profile = new MallShopProfile { SpaceId = spaceId };
            _db.MallShopProfiles.Add(profile);
        }
        profile.TradeCategory = request.TradeCategory;
        profile.StorefrontName = request.StorefrontName;
        profile.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Facility", "MallShop", spaceId.ToString(), after: new { request.TradeCategory }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { space }, ct))[0]);
    }

    private async Task<List<MallShopDto>> ToDtosAsync(IReadOnlyCollection<Space> spaces, CancellationToken ct)
    {
        var facilityIds = spaces.Select(s => s.FacilityId).Distinct().ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);
        var spaceIds = spaces.Select(s => s.Id).ToList();
        var profiles = await _db.MallShopProfiles.Where(p => spaceIds.Contains(p.SpaceId)).ToDictionaryAsync(p => p.SpaceId, p => p, ct);
        var unitIds = spaces.Where(s => s.PropertyUnitId.HasValue).Select(s => s.PropertyUnitId!.Value).Distinct().ToList();

        var leases = await _db.Leases.Where(l => unitIds.Contains(l.UnitId) && l.Status < LeaseStatus.Expired)
            .OrderByDescending(l => l.CreatedAt).ToListAsync(ct);
        var leaseByUnit = leases.GroupBy(l => l.UnitId).ToDictionary(g => g.Key, g => g.First());
        var tenantIds = leases.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));

        return spaces.Select(s =>
        {
            profiles.TryGetValue(s.Id, out var profile);
            Lease? lease = s.PropertyUnitId.HasValue ? leaseByUnit.GetValueOrDefault(s.PropertyUnitId.Value) : null;
            return new MallShopDto(
                s.Id, s.FacilityId, facilityNames.GetValueOrDefault(s.FacilityId, ""), s.PropertyUnitId ?? Guid.Empty, s.BuildingBlock, s.Code,
                s.AreaSize, s.Rate, s.Status, profile?.TradeCategory, profile?.StorefrontName, profile?.Notes,
                lease?.Id, lease?.Status, lease is not null ? tenantNames.GetValueOrDefault(lease.RentalTenantId) : null);
        }).ToList();
    }
}
