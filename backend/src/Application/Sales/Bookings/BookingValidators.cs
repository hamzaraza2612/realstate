using FluentValidation;

namespace RealEstateErp.Application.Sales.Bookings;

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.ProjectId).NotEmpty();
        RuleFor(x => x.InventoryUnitId).NotEmpty();
        RuleFor(x => x.SalesAgentUserId).NotEmpty();
        RuleFor(x => x.TotalPrice).GreaterThan(0);
        RuleFor(x => x.Discount).GreaterThanOrEqualTo(0).LessThanOrEqualTo(x => x.TotalPrice)
            .WithMessage("Discount cannot exceed the total price.");
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}

public class UpdateBookingRequestValidator : AbstractValidator<UpdateBookingRequest>
{
    public UpdateBookingRequestValidator()
    {
        RuleFor(x => x.SalesAgentUserId).NotEmpty();
        RuleFor(x => x.TotalPrice).GreaterThan(0);
        RuleFor(x => x.Discount).GreaterThanOrEqualTo(0).LessThanOrEqualTo(x => x.TotalPrice)
            .WithMessage("Discount cannot exceed the total price.");
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}
