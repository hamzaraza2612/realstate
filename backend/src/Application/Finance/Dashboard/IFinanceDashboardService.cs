namespace RealEstateErp.Application.Finance.Dashboard;

public interface IFinanceDashboardService
{
    Task<FinanceDashboardDto> GetAsync(CancellationToken ct = default);
}
