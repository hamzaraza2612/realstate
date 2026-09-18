using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Finance.Receivables;

public interface IReceivableService
{
    Task<PagedResult<ReceivableDto>> ListAsync(PagedRequest request, ReceivableFilter filter, CancellationToken ct = default);
}
