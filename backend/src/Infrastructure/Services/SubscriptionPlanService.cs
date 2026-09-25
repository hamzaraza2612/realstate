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
        var plans = await _db.SubscriptionPlans.Include(p => p.Entitlements).OrderBy(p => p.DisplayOrder).ThenBy(p => p.Price).ToListAsync(ct);
        return plans.Select(ToDto).ToList();
    }

    public async Task<Result<SubscriptionPlanDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var plan = await _db.SubscriptionPlans.Include(p => p.Entitlements).FirstOrDefaultAsync(p => p.Id == id, ct);
        return plan is null ? Result.Failure<SubscriptionPlanDto>("Plan not found.", "not_found") : Result.Success(ToDto(plan));
    }

    public async Task<Result<SubscriptionPlanDto>> CreateAsync(CreateSubscriptionPlanRequest request, CancellationToken ct = default)
    {
        var codeTaken = await _db.SubscriptionPlans.AnyAsync(p => p.Code == request.Code, ct);
        if (codeTaken) return Result.Failure<SubscriptionPlanDto>("A plan with this code already exists.", "code_taken");

        var plan = new SubscriptionPlan
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            DisplayOrder = request.DisplayOrder,
            TrialDays = request.TrialDays,
            Currency = request.Currency.ToUpperInvariant(),
            Price = request.Price,
            SetupPrice = request.SetupPrice,
            BillingCycle = request.BillingCycle,
            MetadataJson = request.MetadataJson,
            IsActive = true,
            Entitlements = ToEntitlements(request.Entitlements)
        };

        _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Subscription", "SubscriptionPlan", plan.Id.ToString(), after: new { plan.Name, plan.Code }, ct: ct);

        return Result.Success(ToDto(plan));
    }

    public async Task<Result<SubscriptionPlanDto>> UpdateAsync(Guid id, UpdateSubscriptionPlanRequest request, CancellationToken ct = default)
    {
        var plan = await _db.SubscriptionPlans.Include(p => p.Entitlements).FirstOrDefaultAsync(p => p.Id == id, ct);
        if (plan is null) return Result.Failure<SubscriptionPlanDto>("Plan not found.", "not_found");

        var before = ToDto(plan);
        plan.Name = request.Name;
        plan.Description = request.Description;
        plan.DisplayOrder = request.DisplayOrder;
        plan.IsActive = request.IsActive;
        plan.TrialDays = request.TrialDays;
        plan.Currency = request.Currency.ToUpperInvariant();
        plan.Price = request.Price;
        plan.SetupPrice = request.SetupPrice;
        plan.BillingCycle = request.BillingCycle;
        plan.MetadataJson = request.MetadataJson;

        _db.PlanEntitlements.RemoveRange(plan.Entitlements);
        plan.Entitlements = ToEntitlements(request.Entitlements);

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Subscription", "SubscriptionPlan", plan.Id.ToString(), before, ToDto(plan), ct: ct);

        return Result.Success(ToDto(plan));
    }

    private static List<PlanEntitlement> ToEntitlements(IReadOnlyList<PlanEntitlementInput> inputs) =>
        inputs.Select(i => new PlanEntitlement { Code = i.Code, BoolValue = i.BoolValue, NumericValue = i.NumericValue }).ToList();

    private static SubscriptionPlanDto ToDto(SubscriptionPlan p) => new(
        p.Id, p.Name, p.Code, p.Description, p.DisplayOrder, p.IsActive, p.TrialDays, p.Currency,
        p.Price, p.SetupPrice, p.BillingCycle, p.MetadataJson,
        p.Entitlements.Select(e => new PlanEntitlementDto(
            e.Code, EntitlementCodes.All.GetValueOrDefault(e.Code, EntitlementType.Feature), e.BoolValue, e.NumericValue)).ToList());
}
