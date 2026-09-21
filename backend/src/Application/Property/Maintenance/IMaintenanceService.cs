using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Maintenance;

public interface IMaintenanceService
{
    Task<PagedResult<MaintenanceRequestDto>> ListAsync(PagedRequest request, MaintenanceRequestFilter filter, CancellationToken ct = default);
    Task<Result<MaintenanceRequestDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<MaintenanceRequestDto>> CreateAsync(CreateMaintenanceRequestRequest request, CancellationToken ct = default);
    Task<Result<MaintenanceRequestDto>> AssignAsync(Guid id, AssignMaintenanceRequestRequest request, CancellationToken ct = default);
    Task<Result<MaintenanceRequestDto>> ChangeStatusAsync(Guid id, ChangeMaintenanceStatusRequest request, CancellationToken ct = default);
}
