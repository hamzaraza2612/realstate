using Microsoft.AspNetCore.Identity;

namespace RealEstateErp.Infrastructure.Identity;

/// <summary>
/// A role is a named bundle of permissions. TenantId null = system template role (seeded, e.g.
/// "Organization Owner", "Sales Agent") assignable within any tenant. TenantId set = a custom
/// role a tenant created for itself. IsSystem roles cannot be edited/deleted by tenant admins.
/// </summary>
public class AppRole : IdentityRole<Guid>
{
    public Guid? TenantId { get; set; }
    public string? Description { get; set; }
    public bool IsSystem { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = default!;
    public string Module { get; set; } = default!;
    public string? Description { get; set; }
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public AppRole? Role { get; set; }
    public Guid PermissionId { get; set; }
    public Permission? Permission { get; set; }
}
