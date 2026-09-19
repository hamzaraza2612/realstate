namespace RealEstateErp.Application.Construction.Dashboard;

public interface IConstructionDashboardService
{
    Task<ConstructionDashboardDto> GetAsync(CancellationToken ct = default);
}
