using RealEstateErp.Domain.Construction;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Construction.Tasks;

public interface IConstructionTaskService
{
    Task<PagedResult<ConstructionTaskDto>> ListAsync(PagedRequest request, ConstructionTaskFilter filter, CancellationToken ct = default);
    Task<Result<ConstructionTaskDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<ConstructionTaskDto>> CreateAsync(CreateConstructionTaskRequest request, CancellationToken ct = default);
    Task<Result<ConstructionTaskDto>> UpdateAsync(Guid id, UpdateConstructionTaskRequest request, CancellationToken ct = default);
    Task<Result<ConstructionTaskDto>> ChangeStatusAsync(Guid id, ConstructionTaskStatus status, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
