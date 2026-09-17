namespace RealEstateErp.Application.Crm.Dashboard;

public interface ICrmDashboardService
{
    Task<CrmDashboardDto> GetAsync(CancellationToken ct = default);
}
