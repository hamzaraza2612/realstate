using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Finance.Accounts;

public interface IAccountService
{
    Task<PagedResult<AccountDto>> ListAsync(PagedRequest request, AccountFilter filter, CancellationToken ct = default);
    Task<Result<AccountDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task<Result<AccountDto>> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
