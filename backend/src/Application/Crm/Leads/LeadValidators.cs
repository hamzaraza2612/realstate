using FluentValidation;

namespace RealEstateErp.Application.Crm.Leads;

public class CreateLeadRequestValidator : AbstractValidator<CreateLeadRequest>
{
    public CreateLeadRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.CompanyName).MaximumLength(200);
        RuleFor(x => x.Source).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public class UpdateLeadRequestValidator : AbstractValidator<UpdateLeadRequest>
{
    public UpdateLeadRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.CompanyName).MaximumLength(200);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
    }
}
