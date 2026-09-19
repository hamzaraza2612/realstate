using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Construction.Expenses;

public interface IExpenseService
{
    Task<PagedResult<ExpenseDto>> ListAsync(PagedRequest request, ExpenseFilter filter, CancellationToken ct = default);
    Task<Result<ExpenseDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<ExpenseDto>> CreateAsync(CreateExpenseRequest request, CancellationToken ct = default);
    Task<Result<ExpenseDto>> ApproveAsync(Guid id, CancellationToken ct = default);
    Task<Result<ExpenseDto>> RejectAsync(Guid id, CancellationToken ct = default);
}
