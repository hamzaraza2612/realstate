using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Crm.Activities;

public interface IActivityService
{
    Task<PagedResult<ActivityDto>> ListAsync(PagedRequest request, ActivityFilter filter, CancellationToken ct = default);
    Task<Result<ActivityDto>> CreateAsync(CreateActivityRequest request, CancellationToken ct = default);
    Task<Result<ActivityDto>> UpdateAsync(Guid id, UpdateActivityRequest request, CancellationToken ct = default);
    Task<Result<ActivityDto>> CompleteAsync(Guid id, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
