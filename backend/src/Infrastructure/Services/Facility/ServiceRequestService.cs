using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.ServiceRequests;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;
using ServiceRequestEntity = RealEstateErp.Domain.Facility.ServiceRequest;

namespace RealEstateErp.Infrastructure.Services.Facility;

/// <summary>Reuses Property.MaintenanceStatusRules.CanTransition — ServiceRequest shares the identical
/// Open/Assigned/InProgress/OnHold/Resolved/Cancelled lifecycle as MaintenanceRequest.</summary>
public class ServiceRequestService : IServiceRequestService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ServiceRequestService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ServiceRequestDto>> ListAsync(PagedRequest request, ServiceRequestFilter filter, CancellationToken ct = default)
    {
        var query = _db.FacilityServiceRequests.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(s => s.FacilityId == filter.FacilityId);
        if (filter.SpaceId.HasValue) query = query.Where(s => s.SpaceId == filter.SpaceId);
        if (filter.Status.HasValue) query = query.Where(s => s.Status == filter.Status);
        if (filter.Priority.HasValue) query = query.Where(s => s.Priority == filter.Priority);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s2 = filter.Search.ToLowerInvariant();
            query = query.Where(s => s.RequestNumber.ToLower().Contains(s2) || s.Description.ToLower().Contains(s2));
        }

        var total = await query.CountAsync(ct);
        var requests = await query.OrderByDescending(s => s.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ServiceRequestDto>(await ToDtosAsync(requests, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<ServiceRequestDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var sr = await _db.FacilityServiceRequests.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sr is null) return Result.Failure<ServiceRequestDto>("Service request not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { sr }, ct))[0]);
    }

    public async Task<Result<ServiceRequestDto>> CreateAsync(CreateServiceRequestRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<ServiceRequestDto>("Facility not found.", "not_found");

        if (request.SpaceId.HasValue)
        {
            var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == request.SpaceId, ct);
            if (space is null) return Result.Failure<ServiceRequestDto>("Space not found.", "not_found");
            if (space.FacilityId != request.FacilityId) return Result.Failure<ServiceRequestDto>("Space belongs to a different facility.", "invalid_space");
        }

        if (request.RequesterCustomerId.HasValue)
        {
            var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.RequesterCustomerId, ct);
            if (!customerExists) return Result.Failure<ServiceRequestDto>("Customer not found.", "not_found");
        }

        var sequence = await _db.FacilityServiceRequests.CountAsync(ct) + 1;
        var sr = new ServiceRequestEntity
        {
            RequestNumber = $"SR-{sequence:D6}",
            FacilityId = request.FacilityId,
            SpaceId = request.SpaceId,
            RequesterCustomerId = request.RequesterCustomerId,
            Category = request.Category,
            Priority = request.Priority,
            Description = request.Description,
            ReportedDate = request.ReportedDate,
            AssignedToUserId = request.AssignedToUserId,
            AssignedVendorId = request.AssignedVendorId,
            Status = MaintenanceStatus.Open
        };
        _db.FacilityServiceRequests.Add(sr);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "ServiceRequest", sr.Id.ToString(), after: new { sr.RequestNumber, sr.FacilityId, sr.Category }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { sr }, ct))[0]);
    }

    public async Task<Result<ServiceRequestDto>> ChangeStatusAsync(Guid id, ChangeServiceRequestStatusRequest request, CancellationToken ct = default)
    {
        var sr = await _db.FacilityServiceRequests.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (sr is null) return Result.Failure<ServiceRequestDto>("Service request not found.", "not_found");
        if (!MaintenanceStatusRules.CanTransition(sr.Status, request.Status))
            return Result.Failure<ServiceRequestDto>($"Cannot transition service request from {sr.Status} to {request.Status}.", "invalid_transition");

        var before = sr.Status;
        sr.Status = request.Status;
        if (request.Status == MaintenanceStatus.Resolved)
        {
            sr.ResolutionNotes = request.ResolutionNotes;
            sr.ResolvedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        }
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Facility", "ServiceRequest", sr.Id.ToString(), new { Status = before }, new { sr.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { sr }, ct))[0]);
    }

    private async Task<List<ServiceRequestDto>> ToDtosAsync(IReadOnlyCollection<ServiceRequestEntity> requests, CancellationToken ct)
    {
        var facilityIds = requests.Select(s => s.FacilityId).Distinct().ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);
        var spaceIds = requests.Where(s => s.SpaceId.HasValue).Select(s => s.SpaceId!.Value).Distinct().ToList();
        var spaceCodes = await _db.Spaces.Where(s => spaceIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Code, ct);
        var userIds = requests.SelectMany(s => new[] { s.RequestedByUserId, s.AssignedToUserId }).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var vendorIds = requests.Where(s => s.AssignedVendorId.HasValue).Select(s => s.AssignedVendorId!.Value).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);
        var customerIds = requests.Where(s => s.RequesterCustomerId.HasValue).Select(s => s.RequesterCustomerId!.Value).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);

        return requests.Select(s => new ServiceRequestDto(
            s.Id, s.RequestNumber, s.FacilityId, facilityNames.GetValueOrDefault(s.FacilityId, ""),
            s.SpaceId, s.SpaceId.HasValue ? spaceCodes.GetValueOrDefault(s.SpaceId.Value) : null,
            s.RequestedByUserId, s.RequestedByUserId.HasValue ? userNames.GetValueOrDefault(s.RequestedByUserId.Value) : null,
            s.RequesterCustomerId, s.RequesterCustomerId.HasValue ? customerNames.GetValueOrDefault(s.RequesterCustomerId.Value) : null,
            s.Category, s.Priority, s.Description, s.ReportedDate,
            s.AssignedToUserId, s.AssignedToUserId.HasValue ? userNames.GetValueOrDefault(s.AssignedToUserId.Value) : null,
            s.AssignedVendorId, s.AssignedVendorId.HasValue ? vendorNames.GetValueOrDefault(s.AssignedVendorId.Value) : null,
            s.Status, s.ResolutionNotes, s.ResolvedDate, s.CreatedAt)).ToList();
    }
}
