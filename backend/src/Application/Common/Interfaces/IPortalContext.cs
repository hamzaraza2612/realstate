namespace RealEstateErp.Application.Common.Interfaces;

/// <summary>
/// The portal-session analogue of ITenantContext: resolved once per request from the JWT's
/// "portal_actor_type"/"portal_actor_id" claims (present only on a token carrying "token_use" =
/// "portal" — see Api/Authorization/PermissionAuthorization.cs). ITenantContext.TenantId/UserId are
/// still populated for a portal request too (via the same "tenant_id"/"sub" claims every JWT uses),
/// so a portal service can rely on both: ITenantContext for the tenant filter, IPortalContext for
/// which external actor is calling and what it may see.
/// </summary>
public interface IPortalContext
{
    Guid PortalUserId { get; }

    /// <summary>One of Domain.Portal.PortalActorTypes. Empty outside a portal request.</summary>
    string ActorType { get; }

    Guid ActorId { get; }
}
