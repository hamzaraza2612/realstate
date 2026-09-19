namespace RealEstateErp.Application.Sales.Dashboard;

public interface ISalesDashboardService
{
    Task<SalesDashboardDto> GetAsync(CancellationToken ct = default);
}
