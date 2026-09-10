using FluentValidation;

namespace RealEstateErp.Application.Subscription;

public class CreateSubscriptionPlanRequestValidator : AbstractValidator<CreateSubscriptionPlanRequest>
{
    public CreateSubscriptionPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.UserLimit).GreaterThan(0);
        RuleFor(x => x.ProjectLimit).GreaterThan(0);
        RuleFor(x => x.StorageLimitMb).GreaterThan(0);
    }
}

public class UpdateSubscriptionPlanRequestValidator : AbstractValidator<UpdateSubscriptionPlanRequest>
{
    public UpdateSubscriptionPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.UserLimit).GreaterThan(0);
        RuleFor(x => x.ProjectLimit).GreaterThan(0);
        RuleFor(x => x.StorageLimitMb).GreaterThan(0);
    }
}
