using FluentValidation;

namespace RealEstateErp.Application.Sales.Payments;

public class RecordPaymentRequestValidator : AbstractValidator<RecordPaymentRequest>
{
    public RecordPaymentRequestValidator()
    {
        RuleFor(x => x.InstallmentId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Method).IsInEnum();
        RuleFor(x => x.ReferenceNumber).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}
