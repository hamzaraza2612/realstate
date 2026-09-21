using FluentValidation;

namespace RealEstateErp.Application.Property.Maintenance;

public class CreateMaintenanceRequestRequestValidator : AbstractValidator<CreateMaintenanceRequestRequest>
{
    public CreateMaintenanceRequestRequestValidator()
    {
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.PropertyId).NotEmpty();
    }
}
