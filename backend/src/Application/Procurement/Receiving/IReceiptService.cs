using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Procurement.Receiving;

public interface IReceiptService
{
    Task<Result<IReadOnlyList<MaterialReceiptDto>>> ListByPurchaseOrderAsync(Guid purchaseOrderId, CancellationToken ct = default);
    Task<Result<MaterialReceiptDto>> CreateAsync(Guid purchaseOrderId, CreateMaterialReceiptRequest request, CancellationToken ct = default);
}
