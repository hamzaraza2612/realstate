using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Portal;

/// <summary>
/// A login credential for an external actor (Customer/RentalTenant/PropertyOwner/Vendor/
/// CoworkingMember) — deliberately NOT an AppUser row. Two reasons: (1) ASP.NET Core Identity's
/// built-in unique index on NormalizedUserName is platform-wide, not per-tenant (every AppUser's
/// UserName is set to its Email) — the same real person could otherwise never hold two portal
/// accounts with the same email at two different tenant organizations, a realistic case for a
/// property buyer/tenant/vendor working with more than one company on the platform. A separate
/// table gives portal email uniqueness scoped to (TenantId, Email) instead. (2) Keeping "internal
/// staff with a role" and "external actor with no internal role" as two distinct tables makes the
/// security boundary a matter of which table/JWT claim a request carries, not a fragile "assigned
/// zero roles" convention that a future change could silently weaken.
///
/// Despite being a separate table, a PortalUser's session integrates with every existing
/// tenant-scoped mechanism unmodified: its JWT carries the same "tenant_id" and "sub" claims the
/// internal JWT does (see PortalTokenClaims), so ITenantContext/the EF tenant query filter, and
/// Notification/NotificationPreference (both keyed by a bare, unconstrained Guid UserId — see
/// Domain/Notifications/Notification.cs) all work with zero code changes. Isolation from internal
/// endpoints comes from one additional claim, "token_use" = "portal", enforced at the authorization
/// layer (see Api/Authorization/PermissionAuthorization.cs), not from anything in this entity.
/// </summary>
public class PortalUser : TenantEntity
{
    public string Email { get; set; } = default!;
    public string NormalizedEmail { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;

    /// <summary>One of PortalActorTypes; together with ActorId identifies the Customer/RentalTenant/
    /// PropertyOwner/Vendor/CoworkingMember row this login represents.</summary>
    public string ActorType { get; set; } = default!;
    public Guid ActorId { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Foundation for a future email-verification step; not enforced anywhere yet (no
    /// verification email is sent in this milestone) — see docs/PORTAL_ARCHITECTURE.md.</summary>
    public bool EmailConfirmed { get; set; }

    public int AccessFailedCount { get; set; }
    public DateTimeOffset? LockedOutUntil { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}
