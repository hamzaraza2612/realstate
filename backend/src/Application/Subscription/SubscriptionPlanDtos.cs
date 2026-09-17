using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.Application.Subscription;

public record SubscriptionPlanDto(
    Guid Id, string Name, decimal Price, BillingCycle BillingCycle, int UserLimit,
    int ProjectLimit, int StorageLimitMb, bool IsActive, IReadOnlyList<string> Features);

public record CreateSubscriptionPlanRequest(
    string Name, decimal Price, BillingCycle BillingCycle, int UserLimit,
    int ProjectLimit, int StorageLimitMb, IReadOnlyList<string> Features);

public record UpdateSubscriptionPlanRequest(
    string Name, decimal Price, BillingCycle BillingCycle, int UserLimit,
    int ProjectLimit, int StorageLimitMb, bool IsActive, IReadOnlyList<string> Features);
