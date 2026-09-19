namespace RealEstateErp.Application.Procurement.Dashboard;

public interface IProcurementDashboardService
{
    Task<ProcurementDashboardDto> GetAsync(CancellationToken ct = default);
}
