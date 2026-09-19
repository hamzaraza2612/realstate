using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Crm.Leads;

public interface ILeadService
{
    Task<PagedResult<LeadDto>> ListAsync(PagedRequest request, LeadFilter filter, CancellationToken ct = default);
    Task<Result<LeadDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<LeadDto>> CreateAsync(CreateLeadRequest request, CancellationToken ct = default);
    Task<Result<LeadDto>> UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<Result<LeadDto>> AssignAsync(Guid id, AssignLeadRequest request, CancellationToken ct = default);
    Task<Result<CustomerDto>> ConvertToCustomerAsync(Guid id, CancellationToken ct = default);
}
