using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Tenants;

public interface IRentalTenantService
{
    Task<PagedResult<RentalTenantDto>> ListAsync(PagedRequest request, RentalTenantFilter filter, CancellationToken ct = default);
    Task<Result<RentalTenantDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<RentalTenantDto>> CreateAsync(CreateRentalTenantRequest request, CancellationToken ct = default);
    Task<Result<RentalTenantDto>> UpdateAsync(Guid id, UpdateRentalTenantRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
