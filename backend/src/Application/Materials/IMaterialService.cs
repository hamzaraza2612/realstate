using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Materials;

public interface IMaterialService
{
    Task<PagedResult<MaterialDto>> ListAsync(PagedRequest request, MaterialFilter filter, CancellationToken ct = default);
    Task<Result<MaterialDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<MaterialDto>> CreateAsync(CreateMaterialRequest request, CancellationToken ct = default);
    Task<Result<MaterialDto>> UpdateAsync(Guid id, UpdateMaterialRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<IReadOnlyList<StockMovementDto>>> ListMovementsAsync(Guid id, CancellationToken ct = default);
    Task<Result<StockMovementDto>> RecordMovementAsync(Guid id, CreateStockMovementRequest request, CancellationToken ct = default);
}
