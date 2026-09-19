using FluentValidation;

namespace RealEstateErp.Application.Construction.WorkPackages;

public class CreateWorkPackageRequestValidator : AbstractValidator<CreateWorkPackageRequest>
{
    public CreateWorkPackageRequestValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Budget).GreaterThanOrEqualTo(0).When(x => x.Budget.HasValue);
        RuleFor(x => x.PlannedEndDate).GreaterThanOrEqualTo(x => x.PlannedStartDate!.Value)
            .When(x => x.PlannedStartDate.HasValue && x.PlannedEndDate.HasValue);
    }
}

public class UpdateWorkPackageRequestValidator : AbstractValidator<UpdateWorkPackageRequest>
{
    public UpdateWorkPackageRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProgressPercent).InclusiveBetween(0, 100);
        RuleFor(x => x.Budget).GreaterThanOrEqualTo(0).When(x => x.Budget.HasValue);
    }
}
