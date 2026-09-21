namespace RealEstateErp.Application.Property.RentalDashboard;

public interface IRentalDashboardService
{
    Task<RentalDashboardDto> GetAsync(CancellationToken ct = default);
}
