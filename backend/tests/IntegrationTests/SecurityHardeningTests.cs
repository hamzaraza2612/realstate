using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class SecurityHardeningTests : TestBase
{
    public SecurityHardeningTests(CustomWebApplicationFactory factory) : base(factory) { }

    private async Task SetTenantStatusAsync(Guid orgId, int status)
    {
        var superAdminToken = await LoginSuperAdminAsync();
        var (success, _, _) = await PostAsync($"/api/v1/platform/organizations/{orgId}/status", new { status }, superAdminToken);
        success.Should().BeTrue();
    }

    [Fact]
    public async Task SuspendedTenant_CannotLogin()
    {
        var (_, orgId, ownerEmail) = await CreateOrganizationAsync("susp-login");
        await SetTenantStatusAsync(orgId, 2); // Suspended

        var (success, _, status) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CancelledTenant_CannotLogin()
    {
        var (_, orgId, ownerEmail) = await CreateOrganizationAsync("cancel-login");
        await SetTenantStatusAsync(orgId, 3); // Cancelled

        var (success, _, status) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ReactivatingASuspendedTenant_RestoresLogin()
    {
        var (_, orgId, ownerEmail) = await CreateOrganizationAsync("reactivate");
        await SetTenantStatusAsync(orgId, 2); // Suspended

        var (blockedSuccess, _, _) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        blockedSuccess.Should().BeFalse();

        await SetTenantStatusAsync(orgId, 1); // Active again

        var (restoredSuccess, restoredBody, _) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        restoredSuccess.Should().BeTrue();
        restoredBody.GetProperty("data").GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task SuspendingATenant_ImmediatelyBlocksAnAlreadyIssuedToken_FromProtectedApis()
    {
        var (token, orgId, _) = await CreateOrganizationAsync("susp-live-token");

        // The token was valid a moment ago — a real protected call succeeds.
        var (beforeSuccess, _, _) = await GetAsync("/api/v1/users", token);
        beforeSuccess.Should().BeTrue();

        await SetTenantStatusAsync(orgId, 2); // Suspended

        // The exact same, still-cryptographically-valid JWT must now be rejected.
        var (afterSuccess, _, afterStatus) = await GetAsync("/api/v1/users", token);
        afterSuccess.Should().BeFalse();
        afterStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SuspendedTenant_CannotRefreshToken()
    {
        var (_, orgId, ownerEmail) = await CreateOrganizationAsync("susp-refresh");
        var (_, loginBody, _) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        var refreshToken = loginBody.GetProperty("data").GetProperty("refreshToken").GetString();

        await SetTenantStatusAsync(orgId, 2); // Suspended

        var (success, _, status) = await PostAsync("/api/v1/auth/refresh", new { refreshToken });
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SuperAdmin_IsNeverBlockedByTenantStatusEnforcement()
    {
        var (_, orgId, _) = await CreateOrganizationAsync("susp-super-admin");
        await SetTenantStatusAsync(orgId, 2); // Suspended — affects the tenant, not the platform

        var superAdminToken = await LoginSuperAdminAsync();
        var (success, _, _) = await GetAsync("/api/v1/platform/organizations", superAdminToken);
        success.Should().BeTrue();
    }

    [Fact]
    public async Task SameNamedCustomRole_CanNowBeCreatedIndependentlyInTwoDifferentTenants()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("role-name-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("role-name-b");
        const string sharedRoleName = "Branch Manager";

        var (successA, _, _) = await PostAsync("/api/v1/roles", new { name = sharedRoleName, description = (string?)null, permissionCodes = Array.Empty<string>() }, tokenA);
        successA.Should().BeTrue();

        // Before this milestone, a global-unique index on the role name alone would have rejected this.
        var (successB, _, statusB) = await PostAsync("/api/v1/roles", new { name = sharedRoleName, description = (string?)null, permissionCodes = Array.Empty<string>() }, tokenB);
        successB.Should().BeTrue();
        statusB.Should().Be(HttpStatusCode.OK);
    }
}
