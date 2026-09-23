namespace RealEstateErp.Domain.Portal;

/// <summary>
/// Rotating refresh token for a PortalUser session — mirrors Infrastructure/Identity/RefreshToken.cs
/// field-for-field (same rotation/hash/revocation design) but FKs to PortalUser instead of AppUser.
/// Deliberately not a TenantEntity, exactly like its internal counterpart: it is only ever looked up
/// by its token hash (a global unique index), before any tenant context can be resolved from a JWT
/// that doesn't exist yet, and the PortalUser it points to is itself tenant-scoped.
/// </summary>
public class PortalRefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PortalUserId { get; set; }
    public string TokenHash { get; set; } = default!;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedByIp { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt is null && DateTimeOffset.UtcNow < ExpiresAt;
}
