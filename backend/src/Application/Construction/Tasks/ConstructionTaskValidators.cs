using FluentValidation;

namespace RealEstateErp.Application.Construction.Tasks;

public class CreateConstructionTaskRequestValidator : AbstractValidator<CreateConstructionTaskRequest>
{
    public CreateConstructionTaskRequestValidator()
    {
        RuleFor(x => x.WorkPackageId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.PlannedEndDate).GreaterThanOrEqualTo(x => x.PlannedStartDate!.Value)
            .When(x => x.PlannedStartDate.HasValue && x.PlannedEndDate.HasValue);
    }
}

public class UpdateConstructionTaskRequestValidator : AbstractValidator<UpdateConstructionTaskRequest>
{
    public UpdateConstructionTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.ProgressPercent).InclusiveBetween(0, 100);
    }
}
