namespace RealEstateErp.Application.Users;

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? PhoneNumber,
    bool IsActive,
    Guid? TenantId,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt);

public record CreateUserRequest(string Email, string FullName, string Password, string? PhoneNumber, IReadOnlyList<string> RoleNames);
public record UpdateUserRequest(string FullName, string? PhoneNumber, bool IsActive);
public record AssignRolesRequest(IReadOnlyList<string> RoleNames);
