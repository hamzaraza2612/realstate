using FluentValidation;

namespace RealEstateErp.Application.Procurement.Vendors;

public class CreateVendorRequestValidator : AbstractValidator<CreateVendorRequest>
{
    public CreateVendorRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.TaxRegistrationNumber).MaximumLength(100);
    }
}

public class UpdateVendorRequestValidator : AbstractValidator<UpdateVendorRequest>
{
    public UpdateVendorRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.TaxRegistrationNumber).MaximumLength(100);
    }
}
