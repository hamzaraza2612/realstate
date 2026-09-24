namespace RealEstateErp.Domain.Portal;

/// <summary>
/// A single-use, time-limited password-reset/initial-activation token for a PortalUser. The same
/// token type serves both flows: inviting a new portal user creates one immediately (so "set your
/// initial password" and "reset your forgotten password" are the same code path, not two).
/// Deliberately not a TenantEntity — same reasoning as PortalRefreshToken (looked up by hash alone,
/// its PortalUser is already tenant-scoped).
/// </summary>
public class PortalPasswordResetToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PortalUserId { get; set; }
    public string TokenHash { get; set; } = default!;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UsedAt { get; set; }

    public bool IsActive => UsedAt is null && DateTimeOffset.UtcNow < ExpiresAt;
}
