namespace RealEstateErp.Application.Finance.Reports;

public interface IFinanceReportService
{
    Task<TrialBalanceDto> GetTrialBalanceAsync(CancellationToken ct = default);
    Task<IncomeSummaryDto> GetIncomeSummaryAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
