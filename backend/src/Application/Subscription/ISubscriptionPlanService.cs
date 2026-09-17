using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Subscription;

public interface ISubscriptionPlanService
{
    Task<IReadOnlyList<SubscriptionPlanDto>> ListAsync(CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> CreateAsync(CreateSubscriptionPlanRequest request, CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> UpdateAsync(Guid id, UpdateSubscriptionPlanRequest request, CancellationToken ct = default);
}
