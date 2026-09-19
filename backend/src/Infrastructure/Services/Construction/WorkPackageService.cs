using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Construction.WorkPackages;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Construction;

public class WorkPackageService : IWorkPackageService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public WorkPackageService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<WorkPackageDto>> ListAsync(PagedRequest request, WorkPackageFilter filter, CancellationToken ct = default)
    {
        var query = _db.WorkPackages.AsQueryable();
        if (filter.ProjectId.HasValue) query = query.Where(w => w.ProjectId == filter.ProjectId);
        if (filter.Status.HasValue) query = query.Where(w => w.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(w => w.Name.ToLower().Contains(s) || w.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var packages = await query.OrderByDescending(w => w.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<WorkPackageDto>(await ToDtosAsync(packages, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<WorkPackageDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wp is null) return Result.Failure<WorkPackageDto>("Work package not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { wp }, ct))[0]);
    }

    public async Task<Result<WorkPackageDto>> CreateAsync(CreateWorkPackageRequest request, CancellationToken ct = default)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == request.ProjectId, ct);
        if (!projectExists) return Result.Failure<WorkPackageDto>("Project not found.", "not_found");

        var codeExists = await _db.WorkPackages.AnyAsync(w => w.ProjectId == request.ProjectId && w.Code == request.Code, ct);
        if (codeExists) return Result.Failure<WorkPackageDto>("A work package with this code already exists in this project.", "duplicate_code");

        var wp = new WorkPackage
        {
            ProjectId = request.ProjectId,
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            PlannedStartDate = request.PlannedStartDate,
            PlannedEndDate = request.PlannedEndDate,
            ManagerUserId = request.ManagerUserId,
            Budget = request.Budget,
            Status = WorkPackageStatus.Planned
        };
        _db.WorkPackages.Add(wp);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Construction", "WorkPackage", wp.Id.ToString(), after: new { wp.Name, wp.Code, wp.ProjectId }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { wp }, ct))[0]);
    }

    public async Task<Result<WorkPackageDto>> UpdateAsync(Guid id, UpdateWorkPackageRequest request, CancellationToken ct = default)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wp is null) return Result.Failure<WorkPackageDto>("Work package not found.", "not_found");

        var before = new { wp.Name, wp.ProgressPercent };
        wp.Name = request.Name;
        wp.Description = request.Description;
        wp.PlannedStartDate = request.PlannedStartDate;
        wp.PlannedEndDate = request.PlannedEndDate;
        wp.ActualStartDate = request.ActualStartDate;
        wp.ActualEndDate = request.ActualEndDate;
        wp.ProgressPercent = request.ProgressPercent;
        wp.ManagerUserId = request.ManagerUserId;
        wp.Budget = request.Budget;

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Construction", "WorkPackage", wp.Id.ToString(), before, new { wp.Name, wp.ProgressPercent }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { wp }, ct))[0]);
    }

    public async Task<Result<WorkPackageDto>> ChangeStatusAsync(Guid id, WorkPackageStatus status, CancellationToken ct = default)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wp is null) return Result.Failure<WorkPackageDto>("Work package not found.", "not_found");
        if (!WorkPackageStatusRules.CanTransition(wp.Status, status))
            return Result.Failure<WorkPackageDto>($"Cannot transition work package from {wp.Status} to {status}.", "invalid_transition");

        var before = wp.Status;
        wp.Status = status;
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("ChangeStatus", "Construction", "WorkPackage", wp.Id.ToString(), new { Status = before }, new { wp.Status }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { wp }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wp is null) return Result.Failure("Work package not found.", "not_found");

        var hasChildren = await _db.ConstructionTasks.AnyAsync(t => t.WorkPackageId == id, ct) ||
                           await _db.Expenses.AnyAsync(e => e.WorkPackageId == id, ct) ||
                           await _db.PurchaseOrders.AnyAsync(o => o.WorkPackageId == id, ct);
        if (hasChildren) return Result.Failure("Cannot delete a work package that has tasks, expenses or purchase orders.", "conflict");

        _db.WorkPackages.Remove(wp);
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Delete", "Construction", "WorkPackage", id.ToString(), before: new { wp.Name }, ct: ct);
        return Result.Success();
    }

    private async Task<List<WorkPackageDto>> ToDtosAsync(IReadOnlyCollection<WorkPackage> packages, CancellationToken ct)
    {
        var projectIds = packages.Select(w => w.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var managerIds = packages.Where(w => w.ManagerUserId.HasValue).Select(w => w.ManagerUserId!.Value).Distinct().ToList();
        var managerNames = await _db.Users.Where(u => managerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var wpIds = packages.Select(w => w.Id).ToList();
        var taskCounts = await _db.ConstructionTasks.Where(t => wpIds.Contains(t.WorkPackageId))
            .GroupBy(t => t.WorkPackageId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        return packages.Select(w => new WorkPackageDto(
            w.Id, w.ProjectId, projectNames.GetValueOrDefault(w.ProjectId, ""), w.Name, w.Code, w.Description,
            w.PlannedStartDate, w.PlannedEndDate, w.ActualStartDate, w.ActualEndDate, w.Status, w.ProgressPercent,
            w.ManagerUserId, w.ManagerUserId.HasValue ? managerNames.GetValueOrDefault(w.ManagerUserId.Value) : null,
            w.Budget, taskCounts.GetValueOrDefault(w.Id), w.CreatedAt, w.UpdatedAt)).ToList();
    }
}
