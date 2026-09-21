using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Property.SecurityDeposits;

public interface ISecurityDepositService
{
    Task<Result<SecurityDepositDto>> GetByLeaseAsync(Guid leaseId, CancellationToken ct = default);
    Task<Result<SecurityDepositDto>> ReceiveAsync(Guid id, ReceiveSecurityDepositRequest request, CancellationToken ct = default);
    Task<Result<SecurityDepositDto>> RefundAsync(Guid id, RefundSecurityDepositRequest request, CancellationToken ct = default);
    Task<Result<SecurityDepositDto>> ForfeitAsync(Guid id, ForfeitSecurityDepositRequest request, CancellationToken ct = default);
}
