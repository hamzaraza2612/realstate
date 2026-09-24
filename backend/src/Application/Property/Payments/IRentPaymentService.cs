using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Property.Payments;

public interface IRentPaymentService
{
    Task<Result<IReadOnlyList<RentPaymentDto>>> ListByLeaseAsync(Guid leaseId, CancellationToken ct = default);
    Task<Result<RentPaymentDto>> RecordAsync(Guid leaseId, RecordRentPaymentRequest request, CancellationToken ct = default);
}
