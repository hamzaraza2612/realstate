using FluentValidation;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Subscription;

public record PlanEntitlementDto(string Code, EntitlementType Type, bool? BoolValue, long? NumericValue);

public record SubscriptionPlanDto(
    Guid Id, string Name, string Code, string? Description, int DisplayOrder, bool IsActive,
    int TrialDays, string Currency, decimal Price, decimal? SetupPrice, BillingCycle BillingCycle,
    string? MetadataJson, IReadOnlyList<PlanEntitlementDto> Entitlements);

public record PlanEntitlementInput(string Code, bool? BoolValue, long? NumericValue);

public record CreateSubscriptionPlanRequest(
    string Name, string Code, string? Description, int DisplayOrder, int TrialDays, string Currency,
    decimal Price, decimal? SetupPrice, BillingCycle BillingCycle, string? MetadataJson,
    IReadOnlyList<PlanEntitlementInput> Entitlements);

public record UpdateSubscriptionPlanRequest(
    string Name, string? Description, int DisplayOrder, bool IsActive, int TrialDays, string Currency,
    decimal Price, decimal? SetupPrice, BillingCycle BillingCycle, string? MetadataJson,
    IReadOnlyList<PlanEntitlementInput> Entitlements);

public interface ISubscriptionPlanService
{
    Task<IReadOnlyList<SubscriptionPlanDto>> ListAsync(CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> CreateAsync(CreateSubscriptionPlanRequest request, CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> UpdateAsync(Guid id, UpdateSubscriptionPlanRequest request, CancellationToken ct = default);
}

public class PlanEntitlementInputValidator : AbstractValidator<PlanEntitlementInput>
{
    public PlanEntitlementInputValidator()
    {
        RuleFor(x => x.Code).NotEmpty().Must(c => EntitlementCodes.All.ContainsKey(c))
            .WithMessage("Unknown entitlement code.");
        RuleFor(x => x).Must(x =>
        {
            if (!EntitlementCodes.All.TryGetValue(x.Code, out var type)) return true; // reported by the code rule above
            return type == EntitlementType.Feature ? x.BoolValue.HasValue : x.NumericValue.HasValue || x.NumericValue is null;
        }).WithMessage("A Feature entitlement requires BoolValue; a Limit entitlement's NumericValue may be null (unlimited) but BoolValue is ignored.");
    }
}

public class CreateSubscriptionPlanRequestValidator : AbstractValidator<CreateSubscriptionPlanRequest>
{
    public CreateSubscriptionPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50).Matches("^[a-z0-9_-]+$")
            .WithMessage("Code must be lowercase alphanumeric with - or _ only.");
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TrialDays).GreaterThanOrEqualTo(0);
        RuleForEach(x => x.Entitlements).SetValidator(new PlanEntitlementInputValidator());
    }
}

public class UpdateSubscriptionPlanRequestValidator : AbstractValidator<UpdateSubscriptionPlanRequest>
{
    public UpdateSubscriptionPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TrialDays).GreaterThanOrEqualTo(0);
        RuleForEach(x => x.Entitlements).SetValidator(new PlanEntitlementInputValidator());
    }
}
