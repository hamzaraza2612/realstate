namespace RealEstateErp.Application.Roles;

public record PermissionDto(Guid Id, string Code, string Module, string? Description);
public record RoleDto(Guid Id, string Name, string? Description, bool IsSystem, bool IsTenantSpecific, IReadOnlyList<string> Permissions);
public record CreateRoleRequest(string Name, string? Description, IReadOnlyList<string> PermissionCodes);
public record UpdateRoleRequest(string? Description, IReadOnlyList<string> PermissionCodes);
