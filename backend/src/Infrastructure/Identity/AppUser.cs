using Microsoft.AspNetCore.Identity;

namespace RealEstateErp.Infrastructure.Identity;

/// <summary>
/// Platform user. TenantId is null for Super Admin / platform staff accounts; every
/// other role (tenant staff, customers, members, tenants, vendors) belongs to exactly one tenant.
/// </summary>
public class AppUser : IdentityUser<Guid>
{
    public Guid? TenantId { get; set; }
    public string FullName { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}
