using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Procurement.PurchaseRequests;

public interface IPurchaseRequestService
{
    Task<PagedResult<PurchaseRequestDto>> ListAsync(PagedRequest request, PurchaseRequestFilter filter, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> CreateAsync(CreatePurchaseRequestRequest request, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> UpdateAsync(Guid id, UpdatePurchaseRequestRequest request, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> SubmitAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> ApproveAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> RejectAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseRequestDto>> CancelAsync(Guid id, CancellationToken ct = default);
}
