using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Application.Approvals;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Communication;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Approvals;
using RealEstateErp.Domain.Communication;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Approvals;

public class ApprovalService : IApprovalService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly ICommunicationService _communicationService;
    private readonly IServiceProvider _serviceProvider;

    public ApprovalService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger,
        ICommunicationService communicationService, IServiceProvider serviceProvider)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _communicationService = communicationService;
        // Resolved lazily (see DecideAsync), not injected directly: a handler like
        // ExpenseApprovalHandler depends on IExpenseService, which itself depends on IApprovalService —
        // eagerly injecting IEnumerable<IApprovalLinkedEntityHandler> here would make the container try
        // to construct this very instance as part of constructing itself. Resolving through
        // IServiceProvider inside a method call, after this instance already exists, asks the scope for
        // an instance it already has cached instead of building a new graph, so the cycle never forms.
        _serviceProvider = serviceProvider;
    }

    public async Task<PagedResult<ApprovalRequestDto>> ListMyInboxAsync(PagedRequest request, ApprovalRequestFilter filter, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var myPermissions = await GetPermissionsAsync(userId, ct);

        var query = _db.ApprovalRequests.Where(a =>
            a.ApproverUserId == userId ||
            (a.RequiredPermission != null && myPermissions.Contains(a.RequiredPermission)));

        query = filter.Status.HasValue ? query.Where(a => a.Status == filter.Status) : query.Where(a => a.Status == ApprovalStatus.Pending);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ApprovalRequestDto>(await ToDtosAsync(items, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<IReadOnlyList<ApprovalRequestDto>>> ListForEntityAsync(string entityType, Guid entityId, CancellationToken ct = default)
    {
        var items = await _db.ApprovalRequests.Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<ApprovalRequestDto>>(await ToDtosAsync(items, ct));
    }

    public async Task<Result<ApprovalRequestDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var request = await _db.ApprovalRequests.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (request is null) return Result.Failure<ApprovalRequestDto>("Approval request not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { request }, ct))[0]);
    }

    public async Task<Result<ApprovalRequestDto>> CreateRequestAsync(CreateApprovalRequestRequest request, CancellationToken ct = default)
    {
        var approvalRequest = new ApprovalRequest
        {
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            RequestedByUserId = _tenantContext.UserId ?? Guid.Empty,
            ApproverUserId = request.ApproverUserId,
            RequiredPermission = request.RequiredPermission,
            RequestComments = request.RequestComments,
            Status = ApprovalStatus.Pending
        };
        _db.ApprovalRequests.Add(approvalRequest);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Approvals", "ApprovalRequest", approvalRequest.Id.ToString(),
            after: new { approvalRequest.EntityType, approvalRequest.EntityId, approvalRequest.ApproverUserId, approvalRequest.RequiredPermission }, ct: ct);

        await NotifyApproversAsync(approvalRequest, ct);

        return Result.Success((await ToDtosAsync(new[] { approvalRequest }, ct))[0]);
    }

    public async Task<Result<ApprovalRequestDto>> DecideAsync(Guid id, DecideApprovalRequestRequest request, CancellationToken ct = default)
    {
        var approvalRequest = await _db.ApprovalRequests.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (approvalRequest is null) return Result.Failure<ApprovalRequestDto>("Approval request not found.", "not_found");
        if (approvalRequest.Status != ApprovalStatus.Pending)
            return Result.Failure<ApprovalRequestDto>("This request has already been decided.", "already_decided");

        var userId = _tenantContext.UserId ?? Guid.Empty;
        var authorized = approvalRequest.ApproverUserId == userId ||
            (approvalRequest.RequiredPermission is not null && (await GetPermissionsAsync(userId, ct)).Contains(approvalRequest.RequiredPermission));
        if (!authorized) return Result.Failure<ApprovalRequestDto>("You are not authorized to decide this request.", "forbidden");

        ApplyDecision(approvalRequest, request.Approve, request.DecisionComments, userId);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Someone else decided it in the instant between our read and write — the concurrency
            // token (xmin) caught it. Report the same "already decided" outcome a sequential race
            // would have produced, rather than a generic 500.
            return Result.Failure<ApprovalRequestDto>("This request has already been decided.", "already_decided");
        }

        await _auditLogger.LogAsync(request.Approve ? "Approve" : "Reject", "Approvals", "ApprovalRequest", approvalRequest.Id.ToString(),
            after: new { approvalRequest.Status, request.DecisionComments }, ct: ct);

        // If the entity type has a registered handler, deciding here also drives its real module
        // action (e.g. actually approving the Expense) — not just this tracking record. Safe against
        // the reverse call: the handler's own ApproveAsync/RejectAsync calls ResolveForEntityAsync,
        // whose "WHERE Status = Pending" guard now matches nothing (we already committed the decision
        // above), so it no-ops instead of recursing.
        var handler = _serviceProvider.GetServices<IApprovalLinkedEntityHandler>()
            .FirstOrDefault(h => h.EntityType == approvalRequest.EntityType);
        if (handler is not null)
        {
            await handler.ApplyDecisionAsync(approvalRequest.EntityId, request.Approve, ct);
        }

        await NotifyRequesterAsync(approvalRequest, ct);

        return Result.Success((await ToDtosAsync(new[] { approvalRequest }, ct))[0]);
    }

    public async Task<ApprovalRequestDto?> ResolveForEntityAsync(string entityType, Guid entityId, bool approved, Guid decidedByUserId, string? decisionComments, CancellationToken ct = default)
    {
        var approvalRequest = await _db.ApprovalRequests
            .Where(a => a.EntityType == entityType && a.EntityId == entityId && a.Status == ApprovalStatus.Pending)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (approvalRequest is null) return null;

        ApplyDecision(approvalRequest, approved, decisionComments, decidedByUserId);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync(approved ? "Approve" : "Reject", "Approvals", "ApprovalRequest", approvalRequest.Id.ToString(),
            after: new { approvalRequest.Status, decisionComments }, ct: ct);

        await NotifyRequesterAsync(approvalRequest, ct);

        return (await ToDtosAsync(new[] { approvalRequest }, ct))[0];
    }

    private static void ApplyDecision(ApprovalRequest approvalRequest, bool approved, string? decisionComments, Guid decidedByUserId)
    {
        approvalRequest.Status = approved ? ApprovalStatus.Approved : ApprovalStatus.Rejected;
        approvalRequest.DecisionComments = decisionComments;
        approvalRequest.DecidedByUserId = decidedByUserId;
        approvalRequest.DecidedAt = DateTimeOffset.UtcNow;
    }

    private async Task NotifyApproversAsync(ApprovalRequest approvalRequest, CancellationToken ct)
    {
        var (title, body) = NotificationTemplates.ApprovalRequested(approvalRequest.EntityType, approvalRequest.RequestComments);

        var recipientIds = new List<Guid>();
        if (approvalRequest.ApproverUserId.HasValue)
        {
            recipientIds.Add(approvalRequest.ApproverUserId.Value);
        }
        else if (approvalRequest.RequiredPermission is not null)
        {
            recipientIds.AddRange(await GetUsersWithPermissionAsync(approvalRequest.RequiredPermission, ct));
        }

        foreach (var recipientId in recipientIds)
        {
            await _communicationService.SendAsync(new SendCommunicationRequest(
                recipientId, CommunicationChannel.InApp | CommunicationChannel.Email, NotificationCategory.ApprovalRequested,
                title, body, approvalRequest.EntityType, approvalRequest.EntityId), ct);
        }
    }

    private async Task NotifyRequesterAsync(ApprovalRequest approvalRequest, CancellationToken ct)
    {
        var (title, body) = NotificationTemplates.ApprovalDecided(
            approvalRequest.EntityType, approvalRequest.Status == ApprovalStatus.Approved, approvalRequest.DecisionComments);

        await _communicationService.SendAsync(new SendCommunicationRequest(
            approvalRequest.RequestedByUserId, CommunicationChannel.InApp | CommunicationChannel.Email, NotificationCategory.ApprovalDecided,
            title, body, approvalRequest.EntityType, approvalRequest.EntityId), ct);
    }

    private async Task<HashSet<string>> GetPermissionsAsync(Guid userId, CancellationToken ct)
    {
        var roleIds = await _db.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync(ct);
        return (await _db.RolePermissions.Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission!.Code).Distinct().ToListAsync(ct)).ToHashSet();
    }

    /// <summary>Restricted to the current tenant explicitly (not just via the ambient query filter,
    /// which this query doesn't touch at all): a system role (TenantId null) is a single shared row
    /// assigned to users across every tenant that uses it, so matching RolePermissions/UserRoles by
    /// RoleId alone — with no tenant check — would notify other tenants' users who happen to hold the
    /// same shared role. Joining to Users filtered by this tenant closes that leak.</summary>
    private async Task<List<Guid>> GetUsersWithPermissionAsync(string permissionCode, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        var roleIds = await _db.RolePermissions.Where(rp => rp.Permission!.Code == permissionCode).Select(rp => rp.RoleId).ToListAsync(ct);
        return await _db.UserRoles.Where(ur => roleIds.Contains(ur.RoleId))
            .Join(_db.Users.Where(u => u.TenantId == tenantId), ur => ur.UserId, u => u.Id, (ur, u) => u.Id)
            .Distinct().ToListAsync(ct);
    }

    private async Task<List<ApprovalRequestDto>> ToDtosAsync(IReadOnlyCollection<ApprovalRequest> items, CancellationToken ct)
    {
        var userIds = items.Select(a => a.RequestedByUserId)
            .Concat(items.Where(a => a.ApproverUserId.HasValue).Select(a => a.ApproverUserId!.Value))
            .Concat(items.Where(a => a.DecidedByUserId.HasValue).Select(a => a.DecidedByUserId!.Value))
            .Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return items.Select(a => new ApprovalRequestDto(
            a.Id, a.EntityType, a.EntityId, a.RequestedByUserId, userNames.GetValueOrDefault(a.RequestedByUserId),
            a.ApproverUserId, a.ApproverUserId.HasValue ? userNames.GetValueOrDefault(a.ApproverUserId.Value) : null,
            a.RequiredPermission, a.RequestComments, a.Status, a.DecisionComments,
            a.DecidedByUserId, a.DecidedByUserId.HasValue ? userNames.GetValueOrDefault(a.DecidedByUserId.Value) : null,
            a.DecidedAt, a.CreatedAt)).ToList();
    }
}
