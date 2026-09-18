using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Application.Finance.Reports;

public record TrialBalanceLineDto(Guid AccountId, string Code, string Name, AccountType Type, decimal TotalDebit, decimal TotalCredit);

public record TrialBalanceDto(IReadOnlyList<TrialBalanceLineDto> Lines, decimal TotalDebit, decimal TotalCredit);

public record IncomeSummaryDto(DateOnly? From, DateOnly? To, decimal TotalRevenue, decimal TotalExpenses, decimal NetIncome);
