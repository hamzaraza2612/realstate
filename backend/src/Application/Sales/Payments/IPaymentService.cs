using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Sales.Payments;

public interface IPaymentService
{
    Task<Result<IReadOnlyList<PaymentDto>>> ListByBookingAsync(Guid bookingId, CancellationToken ct = default);
    Task<Result<PaymentDto>> RecordAsync(Guid bookingId, RecordPaymentRequest request, CancellationToken ct = default);
}
