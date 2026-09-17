using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Organizations;

/// <summary>Platform-level (Super Admin) management of tenant organizations. Always bypasses tenant filtering explicitly.</summary>
public interface IOrganizationService
{
    Task<PagedResult<OrganizationDto>> ListAsync(PagedRequest request, string? search, CancellationToken ct = default);
    Task<Result<OrganizationDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<OrganizationDto>> CreateAsync(CreateOrganizationRequest request, CancellationToken ct = default);
    Task<Result<OrganizationDto>> UpdateAsync(Guid id, UpdateOrganizationRequest request, CancellationToken ct = default);
    Task<Result<OrganizationDto>> UpdateStatusAsync(Guid id, UpdateOrganizationStatusRequest request, CancellationToken ct = default);

    /// <summary>Current tenant's own profile (for org admins), not the platform view.</summary>
    Task<Result<OrganizationDto>> GetCurrentAsync(CancellationToken ct = default);
}
