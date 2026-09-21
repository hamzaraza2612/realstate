using FluentValidation;

namespace RealEstateErp.Application.Property.Units;

public class CreatePropertyUnitRequestValidator : AbstractValidator<CreatePropertyUnitRequest>
{
    public CreatePropertyUnitRequestValidator()
    {
        RuleFor(x => x.UnitNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.AreaSize).GreaterThan(0).When(x => x.AreaSize.HasValue);
        RuleFor(x => x.MarketRentRate).GreaterThanOrEqualTo(0).When(x => x.MarketRentRate.HasValue);
    }
}

public class UpdatePropertyUnitRequestValidator : AbstractValidator<UpdatePropertyUnitRequest>
{
    public UpdatePropertyUnitRequestValidator()
    {
        RuleFor(x => x.UnitNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.AreaSize).GreaterThan(0).When(x => x.AreaSize.HasValue);
        RuleFor(x => x.MarketRentRate).GreaterThanOrEqualTo(0).When(x => x.MarketRentRate.HasValue);
    }
}
