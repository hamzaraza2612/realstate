namespace RealEstateErp.Application.Common.Interfaces;

/// <summary>
/// Resolved once per request from the JWT claims. TenantId is null for Super Admin/platform
/// tokens. BypassTenantFilter is only ever set to true by platform-scoped endpoints after an
/// explicit "SuperAdminOnly" authorization check — never implicitly from IsSuperAdmin alone.
/// </summary>
public interface ITenantContext
{
    Guid? TenantId { get; }
    Guid? UserId { get; }
    string? UserEmail { get; }
    bool IsSuperAdmin { get; }
    bool BypassTenantFilter { get; }

    void EnableSuperAdminBypass();
}
