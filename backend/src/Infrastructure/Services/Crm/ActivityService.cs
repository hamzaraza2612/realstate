using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Crm;

public class ActivityService : IActivityService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ActivityService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ActivityDto>> ListAsync(PagedRequest request, ActivityFilter filter, CancellationToken ct = default)
    {
        var query = _db.Activities.AsQueryable();

        if (filter.LeadId.HasValue) query = query.Where(a => a.LeadId == filter.LeadId);
        if (filter.CustomerId.HasValue) query = query.Where(a => a.CustomerId == filter.CustomerId);
        if (filter.Status.HasValue) query = query.Where(a => a.Status == filter.Status);
        if (filter.Type.HasValue) query = query.Where(a => a.Type == filter.Type);
        if (filter.AssignedToUserId.HasValue) query = query.Where(a => a.AssignedToUserId == filter.AssignedToUserId);

        var total = await query.CountAsync(ct);
        var activities = await query
            .OrderBy(a => a.Status == ActivityStatus.Pending ? 0 : 1)
            .ThenBy(a => a.DueDate)
            .ThenByDescending(a => a.CreatedAt)
            .Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = await ToDtosAsync(activities, ct);
        return new PagedResult<ActivityDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<ActivityDto>> CreateAsync(CreateActivityRequest request, CancellationToken ct = default)
    {
        if (request.LeadId.HasValue && !await _db.Leads.AnyAsync(l => l.Id == request.LeadId, ct))
        {
            return Result.Failure<ActivityDto>("Lead not found.", "not_found");
        }
        if (request.CustomerId.HasValue && !await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct))
        {
            return Result.Failure<ActivityDto>("Customer not found.", "not_found");
        }

        var activity = new Activity
        {
            Type = request.Type,
            Subject = request.Subject,
            Description = request.Description,
            DueDate = request.DueDate,
            LeadId = request.LeadId,
            CustomerId = request.CustomerId,
            AssignedToUserId = request.AssignedToUserId,
            Status = ActivityStatus.Pending
        };

        _db.Activities.Add(activity);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Crm", "Activity", activity.Id.ToString(),
            after: new { activity.Type, activity.Subject, activity.LeadId, activity.CustomerId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { activity }, ct))[0]);
    }

    public async Task<Result<ActivityDto>> UpdateAsync(Guid id, UpdateActivityRequest request, CancellationToken ct = default)
    {
        var activity = await _db.Activities.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (activity is null) return Result.Failure<ActivityDto>("Activity not found.", "not_found");

        var before = new { activity.Subject, activity.DueDate };
        activity.Subject = request.Subject;
        activity.Description = request.Description;
        activity.DueDate = request.DueDate;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Crm", "Activity", activity.Id.ToString(), before,
            new { activity.Subject, activity.DueDate }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { activity }, ct))[0]);
    }

    public async Task<Result<ActivityDto>> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var activity = await _db.Activities.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (activity is null) return Result.Failure<ActivityDto>("Activity not found.", "not_found");
        if (activity.Status == ActivityStatus.Completed) return Result.Failure<ActivityDto>("Activity is already completed.", "already_completed");

        activity.Status = ActivityStatus.Completed;
        activity.CompletedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Complete", "Crm", "Activity", activity.Id.ToString(), ct: ct);

        return Result.Success((await ToDtosAsync(new[] { activity }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var activity = await _db.Activities.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (activity is null) return Result.Failure("Activity not found.", "not_found");

        _db.Activities.Remove(activity);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Crm", "Activity", id.ToString(), before: new { activity.Subject }, ct: ct);

        return Result.Success();
    }

    private async Task<List<ActivityDto>> ToDtosAsync(IReadOnlyCollection<Activity> activities, CancellationToken ct)
    {
        var userIds = activities.Where(a => a.AssignedToUserId.HasValue).Select(a => a.AssignedToUserId!.Value).Distinct().ToList();
        var userNames = userIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return activities.Select(a => new ActivityDto(
            a.Id, a.Type, a.Subject, a.Description, a.DueDate, a.Status, a.CompletedAt, a.LeadId, a.CustomerId,
            a.AssignedToUserId,
            a.AssignedToUserId.HasValue && userNames.TryGetValue(a.AssignedToUserId.Value, out var name) ? name : null,
            a.CreatedAt)).ToList();
    }
}
