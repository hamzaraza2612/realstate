using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Crm.Customers;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> ListAsync(PagedRequest request, CustomerFilter filter, CancellationToken ct = default);
    Task<Result<CustomerDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<CustomerDto>> CreateAsync(CreateCustomerRequest request, CancellationToken ct = default);
    Task<Result<CustomerDto>> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken ct = default);
}
