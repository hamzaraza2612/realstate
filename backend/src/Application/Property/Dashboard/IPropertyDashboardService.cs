namespace RealEstateErp.Application.Property.Dashboard;

public interface IPropertyDashboardService
{
    Task<PropertyDashboardDto> GetAsync(CancellationToken ct = default);
}
