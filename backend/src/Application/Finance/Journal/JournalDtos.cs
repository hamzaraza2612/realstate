using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Application.Finance.Journal;

public record JournalLineDto(
    Guid Id,
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal Debit,
    decimal Credit,
    string? Description);

public record JournalEntryDto(
    Guid Id,
    string EntryNumber,
    DateOnly EntryDate,
    string? Description,
    string ReferenceType,
    Guid? ReferenceId,
    JournalEntryStatus Status,
    Guid? CreatedBy,
    string? CreatedByName,
    decimal TotalDebit,
    decimal TotalCredit,
    IReadOnlyList<JournalLineDto> Lines,
    bool IsReversed,
    Guid? ReversalOfEntryId,
    DateTimeOffset CreatedAt);

public record CreateJournalLineRequest(Guid AccountId, decimal Debit, decimal Credit, string? Description);

public record CreateJournalEntryRequest(DateOnly EntryDate, string? Description, IReadOnlyList<CreateJournalLineRequest> Lines);

public record JournalEntryFilter(JournalEntryStatus? Status, string? ReferenceType, string? Search);

public record ReverseJournalEntryRequest(DateOnly? ReversalDate, string? Reason);
