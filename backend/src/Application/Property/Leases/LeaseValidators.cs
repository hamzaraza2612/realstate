using FluentValidation;

namespace RealEstateErp.Application.Property.Leases;

public class CreateLeaseRequestValidator : AbstractValidator<CreateLeaseRequest>
{
    public CreateLeaseRequestValidator()
    {
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate).WithMessage("End date must be after the start date.");
        RuleFor(x => x.RentAmount).GreaterThan(0);
        RuleFor(x => x.SecurityDeposit).GreaterThanOrEqualTo(0);
        RuleFor(x => x.GracePeriodDays).GreaterThanOrEqualTo(0);
    }
}

public class UpdateLeaseRequestValidator : AbstractValidator<UpdateLeaseRequest>
{
    public UpdateLeaseRequestValidator()
    {
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate).WithMessage("End date must be after the start date.");
        RuleFor(x => x.RentAmount).GreaterThan(0);
        RuleFor(x => x.SecurityDeposit).GreaterThanOrEqualTo(0);
        RuleFor(x => x.GracePeriodDays).GreaterThanOrEqualTo(0);
    }
}
