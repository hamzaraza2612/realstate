using FluentValidation;

namespace RealEstateErp.Application.Crm.Activities;

public class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x)
            .Must(x => x.LeadId.HasValue || x.CustomerId.HasValue)
            .WithMessage("An activity must be linked to a lead or a customer.");
    }
}

public class UpdateActivityRequestValidator : AbstractValidator<UpdateActivityRequest>
{
    public UpdateActivityRequestValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
    }
}
