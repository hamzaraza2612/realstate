using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services;

public class SubscriptionPlanService : ISubscriptionPlanService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public SubscriptionPlanService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<IReadOnlyList<SubscriptionPlanDto>> ListAsync(CancellationToken ct = default)
    {
        var plans = await _db.SubscriptionPlans.Include(p => p.Features).OrderBy(p => p.Price).ToListAsync(ct);
        return plans.Select(ToDto).ToList();
    }

    public async Task<Result<SubscriptionPlanDto>> CreateAsync(CreateSubscriptionPlanRequest request, CancellationToken ct = default)
    {
        var plan = new SubscriptionPlan
        {
            Name = request.Name,
            Price = request.Price,
            BillingCycle = request.BillingCycle,
            UserLimit = request.UserLimit,
            ProjectLimit = request.ProjectLimit,
            StorageLimitMb = request.StorageLimitMb,
            IsActive = true,
            Features = request.Features.Select(f => new PlanFeature { FeatureCode = f }).ToList()
        };

        _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Subscription", "SubscriptionPlan", plan.Id.ToString(), after: request, ct: ct);

        return Result.Success(ToDto(plan));
    }

    public async Task<Result<SubscriptionPlanDto>> UpdateAsync(Guid id, UpdateSubscriptionPlanRequest request, CancellationToken ct = default)
    {
        var plan = await _db.SubscriptionPlans.Include(p => p.Features).FirstOrDefaultAsync(p => p.Id == id, ct);
        if (plan is null) return Result.Failure<SubscriptionPlanDto>("Plan not found.", "not_found");

        var before = ToDto(plan);
        plan.Name = request.Name;
        plan.Price = request.Price;
        plan.BillingCycle = request.BillingCycle;
        plan.UserLimit = request.UserLimit;
        plan.ProjectLimit = request.ProjectLimit;
        plan.StorageLimitMb = request.StorageLimitMb;
        plan.IsActive = request.IsActive;

        _db.PlanFeatures.RemoveRange(plan.Features);
        plan.Features = request.Features.Select(f => new PlanFeature { FeatureCode = f, SubscriptionPlanId = plan.Id }).ToList();

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Subscription", "SubscriptionPlan", plan.Id.ToString(), before, ToDto(plan), ct: ct);

        return Result.Success(ToDto(plan));
    }

    private static SubscriptionPlanDto ToDto(SubscriptionPlan p) => new(
        p.Id, p.Name, p.Price, p.BillingCycle, p.UserLimit, p.ProjectLimit, p.StorageLimitMb, p.IsActive,
        p.Features.Select(f => f.FeatureCode).ToList());
}
