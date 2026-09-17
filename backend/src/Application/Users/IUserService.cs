using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Users;

public interface IUserService
{
    Task<PagedResult<UserDto>> ListAsync(PagedRequest request, string? search, CancellationToken ct = default);
    Task<Result<UserDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<Result<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default);
    Task<Result> DeactivateAsync(Guid id, CancellationToken ct = default);
    Task<Result<UserDto>> AssignRolesAsync(Guid id, AssignRolesRequest request, CancellationToken ct = default);
}
