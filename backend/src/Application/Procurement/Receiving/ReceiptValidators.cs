using FluentValidation;

namespace RealEstateErp.Application.Procurement.Receiving;

public class CreateMaterialReceiptRequestValidator : AbstractValidator<CreateMaterialReceiptRequest>
{
    public CreateMaterialReceiptRequestValidator()
    {
        RuleFor(x => x.Lines).Must(l => l.Count > 0).WithMessage("At least one line item is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.PurchaseOrderLineId).NotEmpty();
            line.RuleFor(l => l.ReceivedQuantity).GreaterThan(0);
        });
    }
}
