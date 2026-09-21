using FluentValidation;

namespace RealEstateErp.Application.Property.Tenants;

public class CreateRentalTenantRequestValidator : AbstractValidator<CreateRentalTenantRequest>
{
    public CreateRentalTenantRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotNull().When(x => string.IsNullOrWhiteSpace(x.FullName));
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200).When(x => x.CustomerId is null);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public class UpdateRentalTenantRequestValidator : AbstractValidator<UpdateRentalTenantRequest>
{
    public UpdateRentalTenantRequestValidator()
    {
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}
