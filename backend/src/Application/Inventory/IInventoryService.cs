using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Inventory;

public interface IInventoryService
{
    Task<PagedResult<InventoryUnitDto>> ListAsync(PagedRequest request, InventoryFilter filter, CancellationToken ct = default);
    Task<Result<InventoryUnitDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<InventoryUnitDto>> CreateAsync(CreateInventoryUnitRequest request, CancellationToken ct = default);
    Task<Result<InventoryUnitDto>> UpdateAsync(Guid id, UpdateInventoryUnitRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<InventoryUnitDto>> ChangeStatusAsync(Guid id, ChangeInventoryStatusRequest request, CancellationToken ct = default);
}
