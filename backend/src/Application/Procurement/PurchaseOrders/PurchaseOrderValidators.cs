using FluentValidation;

namespace RealEstateErp.Application.Procurement.PurchaseOrders;

public class CreatePurchaseOrderRequestValidator : AbstractValidator<CreatePurchaseOrderRequest>
{
    public CreatePurchaseOrderRequestValidator()
    {
        RuleFor(x => x.VendorId).NotEmpty();
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.Discount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TaxAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Lines).Must(l => l.Count > 0).WithMessage("At least one line item is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ItemDescription).NotEmpty().MaximumLength(300);
            line.RuleFor(l => l.UnitOfMeasure).NotEmpty().MaximumLength(30);
            line.RuleFor(l => l.Quantity).GreaterThan(0);
            line.RuleFor(l => l.UnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}

public class UpdatePurchaseOrderRequestValidator : AbstractValidator<UpdatePurchaseOrderRequest>
{
    public UpdatePurchaseOrderRequestValidator()
    {
        RuleFor(x => x.Discount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TaxAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Lines).Must(l => l.Count > 0).WithMessage("At least one line item is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ItemDescription).NotEmpty().MaximumLength(300);
            line.RuleFor(l => l.UnitOfMeasure).NotEmpty().MaximumLength(30);
            line.RuleFor(l => l.Quantity).GreaterThan(0);
            line.RuleFor(l => l.UnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}
