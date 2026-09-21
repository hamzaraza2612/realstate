using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class TenantIsolationTests : TestBase
{
    public TenantIsolationTests(CustomWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Owner_CannotSeeUsersFromAnotherTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("tenant-a");
        var (tokenB, _, ownerEmailB) = await CreateOrganizationAsync("tenant-b");

        var (successA, bodyA, _) = await GetAsync("/api/v1/users", tokenA);
        successA.Should().BeTrue();
        var emailsVisibleToA = bodyA.GetProperty("data").EnumerateArray().Select(u => u.GetProperty("email").GetString()).ToList();
        emailsVisibleToA.Should().NotContain(ownerEmailB);

        var (successB, bodyB, _) = await GetAsync("/api/v1/users", tokenB);
        successB.Should().BeTrue();
        bodyB.GetProperty("data").EnumerateArray().Should().HaveCount(1);
        bodyB.GetProperty("data")[0].GetProperty("email").GetString().Should().Be(ownerEmailB);
    }

    [Fact]
    public async Task Owner_CannotSeeAuditLogsFromAnotherTenant()
    {
        var (tokenA, orgIdA, _) = await CreateOrganizationAsync("audit-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("audit-b");

        var (_, bodyA, _) = await GetAsync("/api/v1/audit-logs", tokenA);
        var (_, bodyB, _) = await GetAsync("/api/v1/audit-logs", tokenB);

        var tenantIdsSeenByA = bodyA.GetProperty("data").EnumerateArray()
            .Select(e => e.GetProperty("tenantId").GetString())
            .Distinct()
            .ToList();
        var tenantIdsSeenByB = bodyB.GetProperty("data").EnumerateArray()
            .Select(e => e.GetProperty("tenantId").GetString())
            .Distinct()
            .ToList();

        tenantIdsSeenByA.Should().OnlyContain(id => id == orgIdA.ToString());
        tenantIdsSeenByB.Should().NotContain(orgIdA.ToString());
    }

    [Fact]
    public async Task NonSuperAdmin_CannotAccessPlatformOrganizationsEndpoint()
    {
        var (token, _, _) = await CreateOrganizationAsync("no-platform-access");

        var (success, _, status) = await GetAsync("/api/v1/platform/organizations", token);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Owner_CannotFetchAnotherTenantsUserById()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("byid-a");
        var (_, bodyBUsers, otherOwnerId) = await CreateOrganizationAndGetOwnerIdAsync("byid-b");

        var (success, _, status) = await GetAsync($"/api/v1/users/{otherOwnerId}", tokenA);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SameNamedCustomRoleInAnotherTenant_DoesNotLeakItsPermissionsOnLogin()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("leak-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("leak-b");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        const string sharedRoleName = "Special Cashier";

        var (createRoleASuccess, _, _) = await PostAsync("/api/v1/roles", new
        {
            name = sharedRoleName,
            description = (string?)null,
            permissionCodes = new[] { "roles.manage" }
        }, tokenA);
        createRoleASuccess.Should().BeTrue();

        var (createRoleBSuccess, _, _) = await PostAsync("/api/v1/roles", new
        {
            name = sharedRoleName,
            description = (string?)null,
            permissionCodes = new[] { "users.view" }
        }, tokenB);
        createRoleBSuccess.Should().BeTrue();

        var userEmail = $"cashier-{suffix}@leak-b.test";
        var (createUserSuccess, _, _) = await PostAsync("/api/v1/users", new
        {
            email = userEmail,
            fullName = "Tenant B Cashier",
            password = "Cashier@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { sharedRoleName }
        }, tokenB);
        createUserSuccess.Should().BeTrue();

        var (_, loginBody, _) = await PostAsync("/api/v1/auth/login", new { email = userEmail, password = "Cashier@12345" });
        var permissions = loginBody.GetProperty("data").GetProperty("user").GetProperty("permissions")
            .EnumerateArray().Select(p => p.GetString()).ToList();

        // Tenant B's own grant for this role name must be present...
        permissions.Should().Contain("users.view");
        // ...but Tenant A's identically-named role's permission must never leak in.
        permissions.Should().NotContain("roles.manage");
    }

    private async Task<(string Token, System.Text.Json.JsonElement Users, Guid OwnerId)> CreateOrganizationAndGetOwnerIdAsync(string prefix)
    {
        var (token, _, _) = await CreateOrganizationAsync(prefix);
        var (_, body, _) = await GetAsync("/api/v1/users", token);
        var ownerId = Guid.Parse(body.GetProperty("data")[0].GetProperty("id").GetString()!);
        return (token, body, ownerId);
    }
}
