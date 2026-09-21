using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.RentSchedules;

public interface IRentScheduleService
{
    Task<PagedResult<RentScheduleDto>> ListAsync(PagedRequest request, RentScheduleFilter filter, CancellationToken ct = default);
    Task<Result<IReadOnlyList<RentScheduleDto>>> ListByLeaseAsync(Guid leaseId, CancellationToken ct = default);
}
