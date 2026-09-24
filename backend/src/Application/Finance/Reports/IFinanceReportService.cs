namespace RealEstateErp.Application.Finance.Reports;

public interface IFinanceReportService
{
    Task<TrialBalanceDto> GetTrialBalanceAsync(CancellationToken ct = default);
    Task<IncomeSummaryDto> GetIncomeSummaryAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<BalanceSheetDto> GetBalanceSheetAsync(DateOnly? asOf, CancellationToken ct = default);
    Task<ProfitAndLossDto> GetProfitAndLossAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<CashFlowDto> GetCashFlowAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
