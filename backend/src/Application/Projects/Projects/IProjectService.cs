using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Projects.Projects;

public interface IProjectService
{
    Task<PagedResult<ProjectDto>> ListAsync(PagedRequest request, ProjectFilter filter, CancellationToken ct = default);
    Task<Result<ProjectDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<ProjectDto>> CreateAsync(CreateProjectRequest request, CancellationToken ct = default);
    Task<Result<ProjectDto>> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
