using FluentValidation;

namespace RealEstateErp.Application.Procurement.PurchaseRequests;

public class CreatePurchaseRequestRequestValidator : AbstractValidator<CreatePurchaseRequestRequest>
{
    public CreatePurchaseRequestRequestValidator()
    {
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Lines).Must(l => l.Count > 0).WithMessage("At least one line item is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ItemDescription).NotEmpty().MaximumLength(300);
            line.RuleFor(l => l.UnitOfMeasure).NotEmpty().MaximumLength(30);
            line.RuleFor(l => l.Quantity).GreaterThan(0);
            line.RuleFor(l => l.EstimatedUnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}

public class UpdatePurchaseRequestRequestValidator : AbstractValidator<UpdatePurchaseRequestRequest>
{
    public UpdatePurchaseRequestRequestValidator()
    {
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Lines).Must(l => l.Count > 0).WithMessage("At least one line item is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ItemDescription).NotEmpty().MaximumLength(300);
            line.RuleFor(l => l.UnitOfMeasure).NotEmpty().MaximumLength(30);
            line.RuleFor(l => l.Quantity).GreaterThan(0);
            line.RuleFor(l => l.EstimatedUnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}
