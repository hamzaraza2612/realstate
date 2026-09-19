using FluentValidation;

namespace RealEstateErp.Application.Inventory;

public class CreateInventoryUnitRequestValidator : AbstractValidator<CreateInventoryUnitRequest>
{
    public CreateInventoryUnitRequestValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.AreaSize).GreaterThan(0).When(x => x.AreaSize.HasValue);
        RuleFor(x => x.AreaUnit).IsInEnum().When(x => x.AreaUnit.HasValue);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue);
    }
}

public class UpdateInventoryUnitRequestValidator : AbstractValidator<UpdateInventoryUnitRequest>
{
    public UpdateInventoryUnitRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.AreaSize).GreaterThan(0).When(x => x.AreaSize.HasValue);
        RuleFor(x => x.AreaUnit).IsInEnum().When(x => x.AreaUnit.HasValue);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue);
    }
}

public class ChangeInventoryStatusRequestValidator : AbstractValidator<ChangeInventoryStatusRequest>
{
    public ChangeInventoryStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}
