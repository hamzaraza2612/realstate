using FluentValidation;

namespace RealEstateErp.Application.Sales.PaymentPlans;

public class CreatePaymentPlanRequestValidator : AbstractValidator<CreatePaymentPlanRequest>
{
    public CreatePaymentPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.BookingAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DownPayment).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PlanType).IsInEnum();
        RuleFor(x => x.Frequency).IsInEnum();
        RuleFor(x => x.GracePeriodDays).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NumberOfInstallments).GreaterThanOrEqualTo(1).When(x => x.CustomSchedule is null || x.CustomSchedule.Count == 0);
        RuleForEach(x => x.CustomSchedule).ChildRules(entry =>
        {
            entry.RuleFor(e => e.Value).GreaterThan(0);
        });
    }
}
