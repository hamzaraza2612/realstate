using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class ParkingService : IParkingService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ParkingService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ParkingSpaceDto>> ListSpacesAsync(PagedRequest request, ParkingSpaceFilter filter, CancellationToken ct = default)
    {
        var query = _db.ParkingSpaces.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(p => p.FacilityId == filter.FacilityId);
        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var spaces = await query.OrderBy(p => p.Code).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ParkingSpaceDto>(spaces.Select(p => new ParkingSpaceDto(p.Id, p.FacilityId, p.Code, p.Status)).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<ParkingSpaceDto>> CreateSpaceAsync(CreateParkingSpaceRequest request, CancellationToken ct = default)
    {
        var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == request.FacilityId, ct);
        if (!facilityExists) return Result.Failure<ParkingSpaceDto>("Facility not found.", "not_found");

        var duplicate = await _db.ParkingSpaces.AnyAsync(p => p.FacilityId == request.FacilityId && p.Code == request.Code, ct);
        if (duplicate) return Result.Failure<ParkingSpaceDto>("A parking space with this code already exists.", "duplicate_code");

        var space = new ParkingSpace { FacilityId = request.FacilityId, Code = request.Code };
        _db.ParkingSpaces.Add(space);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "ParkingSpace", space.Id.ToString(), after: new { space.Code }, ct: ct);

        return Result.Success(new ParkingSpaceDto(space.Id, space.FacilityId, space.Code, space.Status));
    }

    public async Task<PagedResult<ParkingAllocationDto>> ListAllocationsAsync(PagedRequest request, ParkingAllocationFilter filter, CancellationToken ct = default)
    {
        var query = _db.ParkingAllocations.AsQueryable();
        if (filter.ParkingSpaceId.HasValue) query = query.Where(a => a.ParkingSpaceId == filter.ParkingSpaceId);
        if (filter.Status.HasValue) query = query.Where(a => a.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var allocations = await query.OrderByDescending(a => a.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ParkingAllocationDto>(await ToDtosAsync(allocations, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<ParkingAllocationDto>> AllocateAsync(CreateParkingAllocationRequest request, CancellationToken ct = default)
    {
        var parkingSpace = await _db.ParkingSpaces.FirstOrDefaultAsync(p => p.Id == request.ParkingSpaceId, ct);
        if (parkingSpace is null) return Result.Failure<ParkingAllocationDto>("Parking space not found.", "not_found");
        if (parkingSpace.Status != ParkingSpaceStatus.Available)
            return Result.Failure<ParkingAllocationDto>("This parking space is not available.", "space_not_available");

        var allocation = new ParkingAllocation
        {
            ParkingSpaceId = request.ParkingSpaceId,
            RentalTenantId = request.RentalTenantId,
            VehicleReference = request.VehicleReference,
            StartDate = request.StartDate,
            Amount = request.Amount,
            Notes = request.Notes
        };
        _db.ParkingAllocations.Add(allocation);
        parkingSpace.Status = ParkingSpaceStatus.Allocated;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Allocate", "Facility", "ParkingAllocation", allocation.Id.ToString(), after: new { allocation.ParkingSpaceId, allocation.Amount }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { allocation }, ct))[0]);
    }

    public async Task<Result<ParkingAllocationDto>> EndAsync(Guid allocationId, CancellationToken ct = default)
    {
        var allocation = await _db.ParkingAllocations.FirstOrDefaultAsync(a => a.Id == allocationId, ct);
        if (allocation is null) return Result.Failure<ParkingAllocationDto>("Parking allocation not found.", "not_found");
        if (allocation.Status == ParkingAllocationStatus.Ended) return Result.Failure<ParkingAllocationDto>("This allocation has already ended.", "already_ended");

        allocation.Status = ParkingAllocationStatus.Ended;
        allocation.EndDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var parkingSpace = await _db.ParkingSpaces.FirstAsync(p => p.Id == allocation.ParkingSpaceId, ct);
        parkingSpace.Status = ParkingSpaceStatus.Available;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("End", "Facility", "ParkingAllocation", allocation.Id.ToString(), ct: ct);

        return Result.Success((await ToDtosAsync(new[] { allocation }, ct))[0]);
    }

    private async Task<List<ParkingAllocationDto>> ToDtosAsync(IReadOnlyCollection<ParkingAllocation> allocations, CancellationToken ct)
    {
        var spaceIds = allocations.Select(a => a.ParkingSpaceId).Distinct().ToList();
        var spaceCodes = await _db.ParkingSpaces.Where(p => spaceIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Code, ct);
        var tenantIds = allocations.Where(a => a.RentalTenantId.HasValue).Select(a => a.RentalTenantId!.Value).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));

        return allocations.Select(a => new ParkingAllocationDto(
            a.Id, a.ParkingSpaceId, spaceCodes.GetValueOrDefault(a.ParkingSpaceId, ""), a.RentalTenantId,
            a.RentalTenantId.HasValue ? tenantNames.GetValueOrDefault(a.RentalTenantId.Value) : null,
            a.VehicleReference, a.StartDate, a.EndDate, a.Amount, a.PaidAmount, a.Status, a.Notes)).ToList();
    }
}
