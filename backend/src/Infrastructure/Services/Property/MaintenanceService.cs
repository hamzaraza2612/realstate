using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class MaintenanceService : IMaintenanceService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MaintenanceService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MaintenanceRequestDto>> ListAsync(PagedRequest request, MaintenanceRequestFilter filter, CancellationToken ct = default)
    {
        var query = _db.MaintenanceRequests.AsQueryable();
        if (filter.PropertyId.HasValue) query = query.Where(m => m.PropertyId == filter.PropertyId);
        if (filter.UnitId.HasValue) query = query.Where(m => m.UnitId == filter.UnitId);
        if (filter.Status.HasValue) query = query.Where(m => m.Status == filter.Status);
        if (filter.Priority.HasValue) query = query.Where(m => m.Priority == filter.Priority);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(m => m.RequestNumber.ToLower().Contains(s) || m.Description.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var requests = await query.OrderByDescending(m => m.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<MaintenanceRequestDto>(await ToDtosAsync(requests, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<MaintenanceRequestDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var maintenance = await _db.MaintenanceRequests.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (maintenance is null) return Result.Failure<MaintenanceRequestDto>("Maintenance request not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { maintenance }, ct))[0]);
    }

    public async Task<Result<MaintenanceRequestDto>> CreateAsync(CreateMaintenanceRequestRequest request, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == request.PropertyId, ct);
        if (property is null) return Result.Failure<MaintenanceRequestDto>("Property not found.", "not_found");

        if (request.UnitId.HasValue)
        {
            var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == request.UnitId, ct);
            if (unit is null) return Result.Failure<MaintenanceRequestDto>("Unit not found.", "not_found");
            if (unit.PropertyId != request.PropertyId) return Result.Failure<MaintenanceRequestDto>("Unit belongs to a different property.", "invalid_unit");
        }

        if (request.AssignedVendorId.HasValue)
        {
            var vendorExists = await _db.Vendors.AnyAsync(v => v.Id == request.AssignedVendorId, ct);
            if (!vendorExists) return Result.Failure<MaintenanceRequestDto>("Vendor not found.", "not_found");
        }

        var sequence = await _db.MaintenanceRequests.CountAsync(ct) + 1;
        var maintenance = new MaintenanceRequest
        {
            RequestNumber = $"MR-{sequence:D6}",
            PropertyId = request.PropertyId,
            UnitId = request.UnitId,
            RentalTenantId = request.RentalTenantId,
            Category = request.Category,
            Priority = request.Priority,
            Description = request.Description,
            ReportedDate = request.ReportedDate,
            AssignedToUserId = request.AssignedToUserId,
            AssignedVendorId = request.AssignedVendorId,
            Status = MaintenanceStatus.Open
        };
        _db.MaintenanceRequests.Add(maintenance);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Property", "MaintenanceRequest", maintenance.Id.ToString(),
            after: new { maintenance.RequestNumber, maintenance.PropertyId, maintenance.Category }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { maintenance }, ct))[0]);
    }

    public async Task<Result<MaintenanceRequestDto>> AssignAsync(Guid id, AssignMaintenanceRequestRequest request, CancellationToken ct = default)
    {
        var maintenance = await _db.MaintenanceRequests.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (maintenance is null) return Result.Failure<MaintenanceRequestDto>("Maintenance request not found.", "not_found");

        if (request.AssignedVendorId.HasValue)
        {
            var vendorExists = await _db.Vendors.AnyAsync(v => v.Id == request.AssignedVendorId, ct);
            if (!vendorExists) return Result.Failure<MaintenanceRequestDto>("Vendor not found.", "not_found");
        }

        maintenance.AssignedToUserId = request.AssignedToUserId;
        maintenance.AssignedVendorId = request.AssignedVendorId;
        if (maintenance.Status == MaintenanceStatus.Open) maintenance.Status = MaintenanceStatus.Assigned;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Assign", "Property", "MaintenanceRequest", maintenance.Id.ToString(),
            after: new { maintenance.AssignedToUserId, maintenance.AssignedVendorId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { maintenance }, ct))[0]);
    }

    public async Task<Result<MaintenanceRequestDto>> ChangeStatusAsync(Guid id, ChangeMaintenanceStatusRequest request, CancellationToken ct = default)
    {
        var maintenance = await _db.MaintenanceRequests.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (maintenance is null) return Result.Failure<MaintenanceRequestDto>("Maintenance request not found.", "not_found");
        if (!MaintenanceStatusRules.CanTransition(maintenance.Status, request.Status))
            return Result.Failure<MaintenanceRequestDto>($"Cannot transition maintenance request from {maintenance.Status} to {request.Status}.", "invalid_transition");

        var before = maintenance.Status;
        maintenance.Status = request.Status;
        if (request.Status == MaintenanceStatus.Resolved)
        {
            maintenance.ResolutionNotes = request.ResolutionNotes;
            maintenance.CompletionDate = request.CompletionDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        }
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Property", "MaintenanceRequest", maintenance.Id.ToString(), new { Status = before }, new { maintenance.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { maintenance }, ct))[0]);
    }

    private async Task<List<MaintenanceRequestDto>> ToDtosAsync(IReadOnlyCollection<MaintenanceRequest> requests, CancellationToken ct)
    {
        var propertyIds = requests.Select(m => m.PropertyId).Distinct().ToList();
        var propertyNames = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var unitIds = requests.Where(m => m.UnitId.HasValue).Select(m => m.UnitId!.Value).Distinct().ToList();
        var unitNumbers = await _db.PropertyUnits.Where(u => unitIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.UnitNumber, ct);
        var tenantIds = requests.Where(m => m.RentalTenantId.HasValue).Select(m => m.RentalTenantId!.Value).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));
        var userIds = requests.Where(m => m.AssignedToUserId.HasValue).Select(m => m.AssignedToUserId!.Value).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var vendorIds = requests.Where(m => m.AssignedVendorId.HasValue).Select(m => m.AssignedVendorId!.Value).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        return requests.Select(m => new MaintenanceRequestDto(
            m.Id, m.RequestNumber, m.PropertyId, propertyNames.GetValueOrDefault(m.PropertyId, ""),
            m.UnitId, m.UnitId.HasValue ? unitNumbers.GetValueOrDefault(m.UnitId.Value) : null,
            m.RentalTenantId, m.RentalTenantId.HasValue ? tenantNames.GetValueOrDefault(m.RentalTenantId.Value) : null,
            m.Category, m.Priority, m.Description, m.ReportedDate,
            m.AssignedToUserId, m.AssignedToUserId.HasValue ? userNames.GetValueOrDefault(m.AssignedToUserId.Value) : null,
            m.AssignedVendorId, m.AssignedVendorId.HasValue ? vendorNames.GetValueOrDefault(m.AssignedVendorId.Value) : null,
            m.Status, m.ResolutionNotes, m.CompletionDate, m.CreatedAt)).ToList();
    }
}
