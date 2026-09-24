using FluentValidation;

namespace RealEstateErp.Application.Finance.FiscalPeriods;

public class CreateFiscalPeriodRequestValidator : AbstractValidator<CreateFiscalPeriodRequest>
{
    public CreateFiscalPeriodRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("End date must be on or after the start date.");
    }
}
