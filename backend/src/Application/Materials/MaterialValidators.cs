using FluentValidation;

namespace RealEstateErp.Application.Materials;

public class CreateMaterialRequestValidator : AbstractValidator<CreateMaterialRequest>
{
    public CreateMaterialRequestValidator()
    {
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.UnitOfMeasure).NotEmpty().MaximumLength(30);
        RuleFor(x => x.MinimumQuantity).GreaterThanOrEqualTo(0);
    }
}

public class UpdateMaterialRequestValidator : AbstractValidator<UpdateMaterialRequest>
{
    public UpdateMaterialRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.MinimumQuantity).GreaterThanOrEqualTo(0);
    }
}

public class CreateStockMovementRequestValidator : AbstractValidator<CreateStockMovementRequest>
{
    public CreateStockMovementRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Quantity).NotEqual(0).WithMessage("Quantity cannot be zero.");
    }
}
