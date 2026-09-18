namespace RealEstateErp.Application.Finance.Dashboard;

public record FinanceDashboardDto(
    decimal TotalRevenue,
    decimal TotalCollected,
    decimal TotalReceivable,
    decimal OverdueReceivable,
    decimal TotalExpenses,
    decimal TotalAssets,
    decimal TotalLiabilities,
    decimal TotalEquity,
    IReadOnlyList<RecentJournalEntryDto> RecentJournalEntries);

public record RecentJournalEntryDto(
    Guid Id,
    string EntryNumber,
    DateOnly EntryDate,
    string? Description,
    string ReferenceType,
    int Status,
    decimal Total,
    DateTimeOffset CreatedAt);
