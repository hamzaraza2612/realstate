namespace RealEstateErp.Application.Common.Interfaces;

public record AccessTokenResult(string Token, DateTimeOffset ExpiresAt);

public interface IJwtTokenService
{
    AccessTokenResult GenerateAccessToken(Guid userId, string email, Guid? tenantId, IEnumerable<string> roles, IEnumerable<string> permissions);

    /// <summary>Same signing key/algorithm/expiry settings as GenerateAccessToken, but a distinct
    /// claim set for an external portal session: "token_use"="portal" (so the internal API's default
    /// authorization policy rejects it everywhere except portal-only endpoints) plus "portal_actor_type"/
    /// "portal_actor_id" (consumed by IPortalContext). No roles/permissions claims are ever added —
    /// a portal session never carries internal permission codes.</summary>
    AccessTokenResult GeneratePortalAccessToken(Guid portalUserId, string email, Guid tenantId, string actorType, Guid actorId);

    string GenerateRefreshToken();
    string HashToken(string token);
}
