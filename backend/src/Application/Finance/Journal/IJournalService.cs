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

    /// <summary>Posts a new, fully-swapped-Debit/Credit journal entry against a Posted entry and marks
    /// the original IsReversed — the original is never edited or deleted (immutability/auditability).</summary>
    Task<Result<JournalEntryDto>> ReverseAsync(Guid id, ReverseJournalEntryRequest request, CancellationToken ct = default);
}
