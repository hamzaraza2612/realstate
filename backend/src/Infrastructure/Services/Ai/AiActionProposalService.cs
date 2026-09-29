using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Ai;
using RealEstateErp.Application.Approvals;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Ai;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>
/// Owns the AiActionProposal lifecycle but deliberately has no Approve/Reject method of its own — the
/// existing generic Approval Inbox (IApprovalService.DecideAsync) is the only place a decision is made;
/// AiActionProposalApprovalHandler (registered as an IApprovalLinkedEntityHandler keyed on
/// EntityType="AiActionProposal") is what calls ExecuteInternalAsync/MarkRejectedAsync here in
/// response. See docs/AI_ARCHITECTURE.md.
/// </summary>
public class AiActionProposalService : IAiActionProposalService
{
    private static readonly TimeSpan ExpiryWindow = TimeSpan.FromHours(72);

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAiToolRegistry _toolRegistry;
    private readonly IApprovalService _approvalService;
    private readonly IAuditLogger _auditLogger;

    public AiActionProposalService(
        AppDbContext db, ITenantContext tenantContext, IAiToolRegistry toolRegistry,
        IApprovalService approvalService, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _toolRegistry = toolRegistry;
        _approvalService = approvalService;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<AiActionProposalDto>> ListMineAsync(PagedRequest request, AiActionProposalFilter filter, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var query = _db.AiActionProposals.Where(p => p.RequestedByUserId == userId);
        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<AiActionProposalDto>(items.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<AiActionProposalDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var proposal = await _db.AiActionProposals.FirstOrDefaultAsync(p => p.Id == id && p.RequestedByUserId == userId, ct);
        if (proposal is null) return Result.Failure<AiActionProposalDto>("Action proposal not found.", "not_found");
        return Result.Success(ToDto(proposal));
    }

    public async Task<Result<AiActionProposalDto>> CreateAsync(
        Guid? conversationId, string actionType, string parametersJson, string explanation,
        string expectedEffect, string riskLevel, string? targetEntityType, Guid? targetEntityId,
        CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId || _tenantContext.UserId is not { } userId)
            return Result.Failure<AiActionProposalDto>("No tenant/user context.", "no_context");

        var tool = _toolRegistry.Find(actionType);
        if (tool is null || tool.Access != AiToolAccess.Write)
            return Result.Failure<AiActionProposalDto>("Unknown write action.", "unknown_action");

        var proposal = new AiActionProposal
        {
            TenantId = tenantId,
            ConversationId = conversationId,
            RequestedByUserId = userId,
            ActionType = actionType,
            TargetEntityType = targetEntityType,
            TargetEntityId = targetEntityId,
            ParametersJson = parametersJson,
            Explanation = explanation,
            ExpectedEffect = expectedEffect,
            RiskLevel = riskLevel,
            Status = AiActionProposalStatus.PendingApproval,
            ExpiresAt = DateTimeOffset.UtcNow.Add(ExpiryWindow),
        };
        _db.AiActionProposals.Add(proposal);
        await _db.SaveChangesAsync(ct);

        // Reuses the existing generic Approval Inbox rather than a second approval engine — anyone
        // holding the tool's own RequiredPermission can decide it, exactly as if it were any other
        // approvable module action. tool.RequiredPermission is never null here in practice (every
        // shipped WRITE tool declares one), but a null would mean "any authenticated user may decide",
        // which CreateRequestAsync's own validator rejects — surfaced as a failure rather than silently
        // creating an unapprovable proposal.
        var approvalResult = await _approvalService.CreateRequestAsync(
            new CreateApprovalRequestRequest("AiActionProposal", proposal.Id, null, tool.RequiredPermission, explanation), ct);
        if (!approvalResult.Succeeded)
            return Result.Failure<AiActionProposalDto>(approvalResult.Error!, approvalResult.ErrorCode!);

        proposal.ApprovalRequestId = approvalResult.Value!.Id;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Propose", "Ai", "AiActionProposal", proposal.Id.ToString(),
            after: new { proposal.ActionType, proposal.TargetEntityType, proposal.TargetEntityId, proposal.RiskLevel }, ct: ct);

        return Result.Success(ToDto(proposal));
    }

    public async Task<Result<AiActionProposalDto>> ExecuteInternalAsync(Guid id, Guid executingUserId, CancellationToken ct = default)
    {
        var proposal = await _db.AiActionProposals.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (proposal is null) return Result.Failure<AiActionProposalDto>("Action proposal not found.", "not_found");

        // Idempotent: a duplicate/retried decision lands here a second time and gets back the same
        // stored outcome instead of re-running the tool.
        if (proposal.Status is AiActionProposalStatus.Executed or AiActionProposalStatus.Failed)
            return Result.Success(ToDto(proposal));

        if (proposal.Status != AiActionProposalStatus.PendingApproval && proposal.Status != AiActionProposalStatus.Approved)
            return Result.Failure<AiActionProposalDto>("This action can no longer be executed.", "invalid_status");

        if (proposal.ExpiresAt < DateTimeOffset.UtcNow)
        {
            TransitionTo(proposal, AiActionProposalStatus.Expired);
            await _db.SaveChangesAsync(ct);
            return Result.Failure<AiActionProposalDto>("This action proposal has expired.", "expired");
        }

        if (proposal.Status == AiActionProposalStatus.PendingApproval)
        {
            TransitionTo(proposal, AiActionProposalStatus.Approved);
        }

        var tool = _toolRegistry.Find(proposal.ActionType);
        var permissions = await GetPermissionsAsync(executingUserId, ct);

        if (tool is null || (tool.RequiredPermission is not null && !permissions.Contains(tool.RequiredPermission)))
        {
            FailProposal(proposal, "The approving user is not authorized to execute this action.");
            await _db.SaveChangesAsync(ct);
            return Result.Failure<AiActionProposalDto>(proposal.ErrorMessage!, "forbidden");
        }

        JsonElement arguments;
        try
        {
            arguments = JsonSerializer.Deserialize<JsonElement>(proposal.ParametersJson);
        }
        catch (JsonException)
        {
            FailProposal(proposal, "The action's stored parameters are invalid.");
            await _db.SaveChangesAsync(ct);
            return Result.Failure<AiActionProposalDto>(proposal.ErrorMessage!, "invalid_parameters");
        }

        var context = new AiToolContext(proposal.TenantId, executingUserId, permissions);
        var execResult = await tool.ExecuteAsync(context, arguments, ct);

        if (!execResult.Succeeded)
        {
            FailProposal(proposal, execResult.Error!);
            await _db.SaveChangesAsync(ct);
            await _auditLogger.LogAsync("ExecuteFailed", "Ai", "AiActionProposal", proposal.Id.ToString(), after: new { execResult.Error, execResult.ErrorCode }, ct: ct);
            return Result.Failure<AiActionProposalDto>(execResult.Error!, execResult.ErrorCode!);
        }

        TransitionTo(proposal, AiActionProposalStatus.Executed);
        proposal.ResultJson = JsonSerializer.Serialize(execResult.Value);
        proposal.ExecutedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Execute", "Ai", "AiActionProposal", proposal.Id.ToString(),
            after: new { proposal.ActionType, proposal.TargetEntityType, proposal.TargetEntityId }, ct: ct);

        return Result.Success(ToDto(proposal));
    }

    public async Task<Result<AiActionProposalDto>> MarkRejectedAsync(Guid id, CancellationToken ct = default)
    {
        var proposal = await _db.AiActionProposals.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (proposal is null) return Result.Failure<AiActionProposalDto>("Action proposal not found.", "not_found");

        if (proposal.Status == AiActionProposalStatus.Rejected) return Result.Success(ToDto(proposal));
        if (proposal.Status != AiActionProposalStatus.PendingApproval)
            return Result.Failure<AiActionProposalDto>("This action can no longer be rejected.", "invalid_status");

        TransitionTo(proposal, AiActionProposalStatus.Rejected);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Reject", "Ai", "AiActionProposal", proposal.Id.ToString(), ct: ct);
        return Result.Success(ToDto(proposal));
    }

    private static void TransitionTo(AiActionProposal proposal, AiActionProposalStatus next)
    {
        if (!AiActionProposalStatusRules.CanTransition(proposal.Status, next))
            throw new InvalidOperationException($"Cannot transition AiActionProposal from {proposal.Status} to {next}.");
        proposal.Status = next;
    }

    private static void FailProposal(AiActionProposal proposal, string error)
    {
        TransitionTo(proposal, AiActionProposalStatus.Failed);
        proposal.ErrorMessage = error;
    }

    private async Task<HashSet<string>> GetPermissionsAsync(Guid userId, CancellationToken ct)
    {
        var roleIds = await _db.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId).ToListAsync(ct);
        return (await _db.RolePermissions.Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission!.Code).Distinct().ToListAsync(ct)).ToHashSet();
    }

    private static AiActionProposalDto ToDto(AiActionProposal p) => new(
        p.Id, p.ConversationId, p.ActionType, p.TargetEntityType, p.TargetEntityId,
        JsonSerializer.Deserialize<object>(p.ParametersJson)!, p.Explanation, p.ExpectedEffect, p.RiskLevel,
        p.Status, p.ApprovalRequestId, p.ResultJson is null ? null : JsonSerializer.Deserialize<object>(p.ResultJson),
        p.ErrorMessage, p.ExpiresAt, p.ExecutedAt, p.CreatedAt);
}
