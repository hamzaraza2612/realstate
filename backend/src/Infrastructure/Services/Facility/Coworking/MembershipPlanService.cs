using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class MembershipPlanService : IMembershipPlanService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public MembershipPlanService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<MembershipPlanDto>> ListAsync(PagedRequest request, MembershipPlanFilter filter, CancellationToken ct = default)
    {
        var query = _db.MembershipPlans.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(p => p.FacilityId == filter.FacilityId);
        if (filter.IsActive.HasValue) query = query.Where(p => p.IsActive == filter.IsActive);

        var total = await query.CountAsync(ct);
        var plans = await query.OrderByDescending(p => p.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var facilityNames = await _db.Facilities.Where(f => plans.Select(p => p.FacilityId).Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        var dtos = plans.Select(p => new MembershipPlanDto(p.Id, p.FacilityId, facilityNames.GetValueOrDefault(p.FacilityId, ""), p.Name, p.DurationDays, p.Price, p.IncludedHoursCredits, p.IsActive)).ToList();
        return new PagedResult<MembershipPlanDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<MembershipPlanDto>> CreateAsync(CreateMembershipPlanRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<MembershipPlanDto>("Facility not found.", "not_found");

        var plan = new MembershipPlan
        {
            FacilityId = request.FacilityId,
            Name = request.Name,
            DurationDays = request.DurationDays,
            Price = request.Price,
            IncludedHoursCredits = request.IncludedHoursCredits
        };
        _db.MembershipPlans.Add(plan);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "MembershipPlan", plan.Id.ToString(), after: new { plan.Name, plan.Price }, ct: ct);

        return Result.Success(new MembershipPlanDto(plan.Id, plan.FacilityId, facility.Name, plan.Name, plan.DurationDays, plan.Price, plan.IncludedHoursCredits, plan.IsActive));
    }

    public async Task<Result<MembershipPlanDto>> UpdateAsync(Guid id, UpdateMembershipPlanRequest request, CancellationToken ct = default)
    {
        var plan = await _db.MembershipPlans.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (plan is null) return Result.Failure<MembershipPlanDto>("Membership plan not found.", "not_found");

        plan.Name = request.Name;
        plan.Price = request.Price;
        plan.IncludedHoursCredits = request.IncludedHoursCredits;
        plan.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        var facility = await _db.Facilities.FirstAsync(f => f.Id == plan.FacilityId, ct);
        await _auditLogger.LogAsync("Update", "Facility", "MembershipPlan", plan.Id.ToString(), after: new { plan.Name, plan.IsActive }, ct: ct);

        return Result.Success(new MembershipPlanDto(plan.Id, plan.FacilityId, facility.Name, plan.Name, plan.DurationDays, plan.Price, plan.IncludedHoursCredits, plan.IsActive));
    }
}
