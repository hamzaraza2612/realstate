using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace RealEstateErp.Api.Authorization;

/// <summary>
/// Permission codes are embedded as "permission" claims in the JWT at login time (see
/// JwtTokenService), so authorization here is a stateless claim check — no DB round trip per
/// request. A Super Admin claim bypasses every permission check. Because permissions are
/// snapshotted into the token, a role/permission change takes effect on the user's next
/// login or token refresh, not immediately — an accepted tradeoff for stateless JWTs.
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }
    public PermissionRequirement(string permission) => Permission = permission;
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        // A portal session never carries permission/is_super_admin claims (see
        // JwtTokenService.GeneratePortalAccessToken), so this check is already redundant in practice —
        // stated explicitly anyway so this handler can never be fooled by a future change to what a
        // portal token happens to carry.
        if (context.User.HasClaim("token_use", "portal"))
        {
            return Task.CompletedTask;
        }

        if (context.User.HasClaim("is_super_admin", "true") ||
            context.User.HasClaim("permission", requirement.Permission))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

/// <summary>The default policy's own requirement (see Program.cs's AddAuthorization: DefaultPolicy =
/// RequireAuthenticatedUser + this) — protects every bare [Authorize] internal endpoint (Notifications,
/// the Approval inbox, etc.) from a portal-issued token exactly the same way PermissionAuthorizationHandler
/// protects every [RequirePermission] endpoint. Succeeds for any token that is NOT a portal token,
/// including every pre-existing internal token (none of which carry "token_use" at all) — zero
/// behavior change for internal auth.</summary>
public class NotPortalRequirement : IAuthorizationRequirement { }

public class NotPortalAuthorizationHandler : AuthorizationHandler<NotPortalRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, NotPortalRequirement requirement)
    {
        if (!context.User.HasClaim("token_use", "portal"))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

/// <summary>The mirror image of NotPortalRequirement, for portal-only endpoints — rejects an internal
/// token (which never carries "token_use") from ever reaching a portal controller.</summary>
public class PortalOnlyRequirement : IAuthorizationRequirement { }

public class PortalOnlyAuthorizationHandler : AuthorizationHandler<PortalOnlyRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PortalOnlyRequirement requirement)
    {
        if (context.User.HasClaim("token_use", "portal"))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

/// <summary>Generates an authorization policy on the fly for any policy name that looks like a permission code (module.entity.action).</summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    public DefaultAuthorizationPolicyProvider FallbackPolicyProvider { get; }

    public PermissionPolicyProvider(Microsoft.Extensions.Options.IOptions<AuthorizationOptions> options)
    {
        FallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => FallbackPolicyProvider.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => FallbackPolicyProvider.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.Contains('.'))
        {
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(policyName))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return FallbackPolicyProvider.GetPolicyAsync(policyName);
    }
}

/// <summary>Use in place of [Authorize] on any controller action that requires a specific permission code.</summary>
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission) : base(permission) { }
}

/// <summary>Use on every External Portal controller in place of [Authorize] — requires a portal-issued
/// token (see PortalOnlyRequirement) and nothing else; object-level scoping to the caller's own actor
/// is each portal service's own responsibility via IPortalContext, not this attribute.</summary>
public class RequirePortalAttribute : AuthorizeAttribute
{
    public RequirePortalAttribute() : base("PortalOnly") { }
}
