using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class MembershipService : IMembershipService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MembershipService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MembershipDto>> ListAsync(PagedRequest request, MembershipFilter filter, CancellationToken ct = default)
    {
        var query = _db.Memberships.AsQueryable();
        if (filter.MemberId.HasValue) query = query.Where(m => m.MemberId == filter.MemberId);
        if (filter.PlanId.HasValue) query = query.Where(m => m.PlanId == filter.PlanId);
        if (filter.Status.HasValue) query = query.Where(m => m.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var memberships = await query.OrderByDescending(m => m.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<MembershipDto>(await ToDtosAsync(memberships, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<MembershipDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (membership is null) return Result.Failure<MembershipDto>("Membership not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { membership }, ct))[0]);
    }

    public async Task<Result<MembershipDto>> CreateAsync(CreateMembershipRequest request, CancellationToken ct = default)
    {
        var member = await _db.CoworkingMembers.FirstOrDefaultAsync(m => m.Id == request.MemberId, ct);
        if (member is null) return Result.Failure<MembershipDto>("Member not found.", "not_found");

        var plan = await _db.MembershipPlans.FirstOrDefaultAsync(p => p.Id == request.PlanId, ct);
        if (plan is null) return Result.Failure<MembershipDto>("Membership plan not found.", "not_found");
        if (!plan.IsActive) return Result.Failure<MembershipDto>("This membership plan is inactive.", "plan_inactive");

        var membership = new Membership
        {
            MemberId = request.MemberId,
            PlanId = request.PlanId,
            StartDate = request.StartDate,
            EndDate = request.StartDate.AddDays(plan.DurationDays),
            Amount = plan.Price
        };
        _db.Memberships.Add(membership);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "Membership", membership.Id.ToString(), after: new { membership.MemberId, membership.PlanId, membership.Amount }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { membership }, ct))[0]);
    }

    public async Task<Result<MembershipDto>> ChangeStatusAsync(Guid id, ChangeMembershipStatusRequest request, CancellationToken ct = default)
    {
        var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (membership is null) return Result.Failure<MembershipDto>("Membership not found.", "not_found");
        if (!MembershipStatusRules.CanTransition(membership.Status, request.Status))
            return Result.Failure<MembershipDto>($"Cannot transition membership from {membership.Status} to {request.Status}.", "invalid_transition");

        var before = membership.Status;
        membership.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Facility", "Membership", membership.Id.ToString(), new { Status = before }, new { membership.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { membership }, ct))[0]);
    }

    private async Task<List<MembershipDto>> ToDtosAsync(IReadOnlyCollection<Membership> memberships, CancellationToken ct)
    {
        var memberIds = memberships.Select(m => m.MemberId).Distinct().ToList();
        var members = await _db.CoworkingMembers.Where(m => memberIds.Contains(m.Id)).ToListAsync(ct);
        var customerIds = members.Select(m => m.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var memberNames = members.ToDictionary(m => m.Id, m => customerNames.GetValueOrDefault(m.CustomerId, ""));
        var planIds = memberships.Select(m => m.PlanId).Distinct().ToList();
        var planNames = await _db.MembershipPlans.Where(p => planIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return memberships.Select(m => new MembershipDto(
            m.Id, m.MemberId, memberNames.GetValueOrDefault(m.MemberId, ""), m.PlanId, planNames.GetValueOrDefault(m.PlanId, ""),
            m.StartDate, m.EndDate, m.Status, m.Amount, m.PaidAmount, m.CreatedAt)).ToList();
    }
}
