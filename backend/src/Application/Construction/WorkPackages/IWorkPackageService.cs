using RealEstateErp.Domain.Construction;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Construction.WorkPackages;

public interface IWorkPackageService
{
    Task<PagedResult<WorkPackageDto>> ListAsync(PagedRequest request, WorkPackageFilter filter, CancellationToken ct = default);
    Task<Result<WorkPackageDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<WorkPackageDto>> CreateAsync(CreateWorkPackageRequest request, CancellationToken ct = default);
    Task<Result<WorkPackageDto>> UpdateAsync(Guid id, UpdateWorkPackageRequest request, CancellationToken ct = default);
    Task<Result<WorkPackageDto>> ChangeStatusAsync(Guid id, WorkPackageStatus status, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
