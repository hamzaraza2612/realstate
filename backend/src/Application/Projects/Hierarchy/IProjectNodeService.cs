using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Projects.Hierarchy;

public interface IProjectNodeService
{
    Task<Result<IReadOnlyList<ProjectNodeDto>>> ListByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<Result<ProjectNodeDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<ProjectNodeDto>> CreateAsync(CreateProjectNodeRequest request, CancellationToken ct = default);
    Task<Result<ProjectNodeDto>> UpdateAsync(Guid id, UpdateProjectNodeRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
