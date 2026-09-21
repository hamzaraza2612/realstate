using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Leases;

public interface ILeaseService
{
    Task<PagedResult<LeaseDto>> ListAsync(PagedRequest request, LeaseFilter filter, CancellationToken ct = default);
    Task<Result<LeaseDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<LeaseDto>> CreateAsync(CreateLeaseRequest request, CancellationToken ct = default);
    Task<Result<LeaseDto>> UpdateAsync(Guid id, UpdateLeaseRequest request, CancellationToken ct = default);
    Task<Result<LeaseDto>> ChangeStatusAsync(Guid id, ChangeLeaseStatusRequest request, CancellationToken ct = default);
}
