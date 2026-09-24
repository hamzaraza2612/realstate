using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Application.Finance.Reports;

public record TrialBalanceLineDto(Guid AccountId, string Code, string Name, AccountType Type, decimal TotalDebit, decimal TotalCredit);

public record TrialBalanceDto(IReadOnlyList<TrialBalanceLineDto> Lines, decimal TotalDebit, decimal TotalCredit);

public record IncomeSummaryDto(DateOnly? From, DateOnly? To, decimal TotalRevenue, decimal TotalExpenses, decimal NetIncome);

public record FinancialStatementLineDto(Guid AccountId, string Code, string Name, decimal Amount);

public record BalanceSheetDto(
    DateOnly AsOf,
    IReadOnlyList<FinancialStatementLineDto> Assets, decimal TotalAssets,
    IReadOnlyList<FinancialStatementLineDto> Liabilities, decimal TotalLiabilities,
    IReadOnlyList<FinancialStatementLineDto> Equity, decimal TotalEquity,
    decimal NetIncome,
    decimal TotalLiabilitiesAndEquity);

public record ProfitAndLossDto(
    DateOnly? From, DateOnly? To,
    IReadOnlyList<FinancialStatementLineDto> RevenueLines, decimal TotalRevenue,
    IReadOnlyList<FinancialStatementLineDto> ExpenseLines, decimal TotalExpenses,
    decimal NetIncome);

public record CashFlowCategoryDto(string ReferenceType, decimal Amount);

public record CashFlowDto(
    DateOnly? From, DateOnly? To,
    decimal OpeningCash,
    IReadOnlyList<CashFlowCategoryDto> Inflows, decimal TotalInflows,
    IReadOnlyList<CashFlowCategoryDto> Outflows, decimal TotalOutflows,
    decimal NetChange,
    decimal ClosingCash);
