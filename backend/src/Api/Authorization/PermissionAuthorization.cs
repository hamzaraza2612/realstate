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
        if (context.User.HasClaim("is_super_admin", "true") ||
            context.User.HasClaim("permission", requirement.Permission))
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
