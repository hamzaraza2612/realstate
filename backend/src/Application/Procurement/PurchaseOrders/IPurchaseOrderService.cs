using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Procurement.PurchaseOrders;

public interface IPurchaseOrderService
{
    Task<PagedResult<PurchaseOrderDto>> ListAsync(PagedRequest request, PurchaseOrderFilter filter, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> CreateAsync(CreatePurchaseOrderRequest request, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> UpdateAsync(Guid id, UpdatePurchaseOrderRequest request, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> SubmitAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> ApproveAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> SendAsync(Guid id, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> CancelAsync(Guid id, CancellationToken ct = default);
}
