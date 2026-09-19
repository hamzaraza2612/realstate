using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Procurement.Vendors;

public interface IVendorService
{
    Task<PagedResult<VendorDto>> ListAsync(PagedRequest request, VendorFilter filter, CancellationToken ct = default);
    Task<Result<VendorDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<VendorDto>> CreateAsync(CreateVendorRequest request, CancellationToken ct = default);
    Task<Result<VendorDto>> UpdateAsync(Guid id, UpdateVendorRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
