using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Construction.Tasks;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Construction;

public class ConstructionTaskService : IConstructionTaskService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ConstructionTaskService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public static bool IsDelayed(ConstructionTask task) =>
        task.Status is ConstructionTaskStatus.Planned or ConstructionTaskStatus.InProgress or ConstructionTaskStatus.Blocked &&
        task.PlannedEndDate.HasValue && task.PlannedEndDate.Value < DateOnly.FromDateTime(DateTime.UtcNow);

    public async Task<PagedResult<ConstructionTaskDto>> ListAsync(PagedRequest request, ConstructionTaskFilter filter, CancellationToken ct = default)
    {
        var query = _db.ConstructionTasks.AsQueryable();
        if (filter.WorkPackageId.HasValue) query = query.Where(t => t.WorkPackageId == filter.WorkPackageId);
        if (filter.AssignedToUserId.HasValue) query = query.Where(t => t.AssignedToUserId == filter.AssignedToUserId);
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status);

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
        if (filter.DelayedOnly == true) tasks = tasks.Where(IsDelayed).ToList();

        var total = tasks.Count;
        var page = tasks.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<ConstructionTaskDto>(await ToDtosAsync(page, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<ConstructionTaskDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var task = await _db.ConstructionTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return Result.Failure<ConstructionTaskDto>("Task not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { task }, ct))[0]);
    }

    public async Task<Result<ConstructionTaskDto>> CreateAsync(CreateConstructionTaskRequest request, CancellationToken ct = default)
    {
        var wpExists = await _db.WorkPackages.AnyAsync(w => w.Id == request.WorkPackageId, ct);
        if (!wpExists) return Result.Failure<ConstructionTaskDto>("Work package not found.", "not_found");

        if (request.DependsOnTaskId.HasValue)
        {
            var predecessor = await _db.ConstructionTasks.FirstOrDefaultAsync(t => t.Id == request.DependsOnTaskId, ct);
            if (predecessor is null) return Result.Failure<ConstructionTaskDto>("Predecessor task not found.", "not_found");
            if (predecessor.WorkPackageId != request.WorkPackageId)
                return Result.Failure<ConstructionTaskDto>("Predecessor task belongs to a different work package.", "invalid_dependency");
        }

        var task = new ConstructionTask
        {
            WorkPackageId = request.WorkPackageId,
            Title = request.Title,
            Description = request.Description,
            AssignedToUserId = request.AssignedToUserId,
            Priority = request.Priority,
            PlannedStartDate = request.PlannedStartDate,
            PlannedEndDate = request.PlannedEndDate,
            DependsOnTaskId = request.DependsOnTaskId,
            Status = ConstructionTaskStatus.Planned
        };
        _db.ConstructionTasks.Add(task);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Construction", "Task", task.Id.ToString(), after: new { task.Title, task.WorkPackageId }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { task }, ct))[0]);
    }

    public async Task<Result<ConstructionTaskDto>> UpdateAsync(Guid id, UpdateConstructionTaskRequest request, CancellationToken ct = default)
    {
        var task = await _db.ConstructionTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return Result.Failure<ConstructionTaskDto>("Task not found.", "not_found");

        var before = new { task.Title, task.ProgressPercent };
        task.Title = request.Title;
        task.Description = request.Description;
        task.AssignedToUserId = request.AssignedToUserId;
        task.Priority = request.Priority;
        task.PlannedStartDate = request.PlannedStartDate;
        task.PlannedEndDate = request.PlannedEndDate;
        task.ActualStartDate = request.ActualStartDate;
        task.ActualEndDate = request.ActualEndDate;
        task.ProgressPercent = request.ProgressPercent;

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Construction", "Task", task.Id.ToString(), before, new { task.Title, task.ProgressPercent }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { task }, ct))[0]);
    }

    public async Task<Result<ConstructionTaskDto>> ChangeStatusAsync(Guid id, ConstructionTaskStatus status, CancellationToken ct = default)
    {
        var task = await _db.ConstructionTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return Result.Failure<ConstructionTaskDto>("Task not found.", "not_found");
        if (!ConstructionTaskStatusRules.CanTransition(task.Status, status))
            return Result.Failure<ConstructionTaskDto>($"Cannot transition task from {task.Status} to {status}.", "invalid_transition");

        var before = task.Status;
        task.Status = status;
        if (status == ConstructionTaskStatus.Completed) task.ProgressPercent = 100;
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("ChangeStatus", "Construction", "Task", task.Id.ToString(), new { Status = before }, new { task.Status }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { task }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await _db.ConstructionTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return Result.Failure("Task not found.", "not_found");

        var hasDependents = await _db.ConstructionTasks.AnyAsync(t => t.DependsOnTaskId == id, ct);
        if (hasDependents) return Result.Failure("Cannot delete a task that other tasks depend on.", "conflict");

        _db.ConstructionTasks.Remove(task);
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Delete", "Construction", "Task", id.ToString(), before: new { task.Title }, ct: ct);
        return Result.Success();
    }

    private async Task<List<ConstructionTaskDto>> ToDtosAsync(IReadOnlyCollection<ConstructionTask> tasks, CancellationToken ct)
    {
        var wpIds = tasks.Select(t => t.WorkPackageId).Distinct().ToList();
        var wpNames = await _db.WorkPackages.Where(w => wpIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, w => w.Name, ct);
        var userIds = tasks.Where(t => t.AssignedToUserId.HasValue).Select(t => t.AssignedToUserId!.Value).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var dependsOnIds = tasks.Where(t => t.DependsOnTaskId.HasValue).Select(t => t.DependsOnTaskId!.Value).Distinct().ToList();
        var dependsOnTitles = await _db.ConstructionTasks.Where(t => dependsOnIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t.Title, ct);

        return tasks.Select(t => new ConstructionTaskDto(
            t.Id, t.WorkPackageId, wpNames.GetValueOrDefault(t.WorkPackageId, ""), t.Title, t.Description,
            t.AssignedToUserId, t.AssignedToUserId.HasValue ? userNames.GetValueOrDefault(t.AssignedToUserId.Value) : null,
            t.Priority, t.PlannedStartDate, t.PlannedEndDate, t.ActualStartDate, t.ActualEndDate, t.Status, t.ProgressPercent,
            t.DependsOnTaskId, t.DependsOnTaskId.HasValue ? dependsOnTitles.GetValueOrDefault(t.DependsOnTaskId.Value) : null,
            t.CreatedAt, t.UpdatedAt)).ToList();
    }
}
