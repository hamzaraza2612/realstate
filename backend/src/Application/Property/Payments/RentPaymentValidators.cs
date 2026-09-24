using FluentValidation;

namespace RealEstateErp.Application.Property.Payments;

public class RecordRentPaymentRequestValidator : AbstractValidator<RecordRentPaymentRequest>
{
    public RecordRentPaymentRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.RentScheduleId).NotEmpty();
    }
}
