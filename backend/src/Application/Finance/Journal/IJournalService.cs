using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Finance.Journal;

public interface IJournalService
{
    Task<PagedResult<JournalEntryDto>> ListAsync(PagedRequest request, JournalEntryFilter filter, CancellationToken ct = default);
    Task<Result<JournalEntryDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<JournalEntryDto>> CreateAsync(CreateJournalEntryRequest request, CancellationToken ct = default);
    Task<Result<JournalEntryDto>> PostAsync(Guid id, CancellationToken ct = default);
    Task<Result<JournalEntryDto>> CancelAsync(Guid id, CancellationToken ct = default);
}
