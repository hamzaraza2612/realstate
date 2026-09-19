using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Sales.PaymentPlans;

public interface IPaymentPlanService
{
    Task<Result<PaymentPlanDto>> GetByBookingAsync(Guid bookingId, CancellationToken ct = default);
    Task<Result<PaymentPlanDto>> CreateAsync(Guid bookingId, CreatePaymentPlanRequest request, CancellationToken ct = default);
}
