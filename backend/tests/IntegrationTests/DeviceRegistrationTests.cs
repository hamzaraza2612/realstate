using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.IntegrationTests;

/// <summary>
/// Covers the Milestone 18 push-notification seam: storing a device token only, never sending a push.
/// See IDeviceRegistrationService's doc comment for what this endpoint does and does not do.
/// </summary>
[Collection("Integration")]
public class DeviceRegistrationTests : TestBase
{
    public DeviceRegistrationTests(CustomWebApplicationFactory factory) : base(factory) { }

    private const string DefaultPassword = "Portal@12345";

    private async Task<string> CreateCustomerAsync(string token, string name)
    {
        var (_, body, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = name, email = (string?)null, phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<(Guid PortalUserId, string PortalToken)> InviteAndLoginPortalUserAsync(
        string ownerToken, string slug, string actorType, string actorId, string email)
    {
        var (inviteSuccess, inviteBody, inviteStatus) = await PostAsync("/api/v1/portal-accounts/invite", new
        {
            actorType, actorId = Guid.Parse(actorId), email
        }, ownerToken);
        inviteSuccess.Should().BeTrue($"invite should succeed: {inviteStatus} {inviteBody}");
        var portalUserId = Guid.Parse(inviteBody.GetProperty("data").GetProperty("id").GetString()!);

        await SetPortalPasswordAsync(portalUserId, DefaultPassword);

        var (loginSuccess, loginBody, loginStatus) = await PortalLoginAsync(slug, email, DefaultPassword);
        loginSuccess.Should().BeTrue($"portal login should succeed: {loginStatus} {loginBody}");
        var token = loginBody.GetProperty("data").GetProperty("accessToken").GetString()!;
        return (portalUserId, token);
    }

    [Fact]
    public async Task InternalUser_CanRegisterDeviceToken()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("device-internal");

        var (success, _, status) = await PostAsync("/api/v1/notifications/device-tokens",
            new { platform = "ios", pushToken = "expo-token-abc" }, ownerToken);

        success.Should().BeTrue();
        status.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task InternalUser_RegisteringSamePlatformTwice_UpsertsRatherThanDuplicating()
    {
        var (ownerToken, orgId, _) = await CreateOrganizationAsync("device-upsert");

        (await PostAsync("/api/v1/notifications/device-tokens", new { platform = "android", pushToken = "token-1" }, ownerToken))
            .Success.Should().BeTrue();
        (await PostAsync("/api/v1/notifications/device-tokens", new { platform = "android", pushToken = "token-2" }, ownerToken))
            .Success.Should().BeTrue();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var registrations = await db.DeviceRegistrations.IgnoreQueryFilters().Where(d => d.TenantId == orgId).ToListAsync();

        registrations.Should().HaveCount(1);
        registrations[0].PushToken.Should().Be("token-2");
    }

    [Fact]
    public async Task InternalUser_InvalidPlatform_IsRejected()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("device-invalid-platform");

        var (success, _, status) = await PostAsync("/api/v1/notifications/device-tokens",
            new { platform = "windows-phone", pushToken = "token" }, ownerToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task InternalUser_EmptyPushToken_IsRejected()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("device-empty-token");

        var (success, _, status) = await PostAsync("/api/v1/notifications/device-tokens",
            new { platform = "ios", pushToken = "" }, ownerToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PortalUser_CanRegisterDeviceToken_AndItIsStoredSeparatelyFromInternalUsers()
    {
        var (ownerToken, orgId, _, slug) = await CreateOrganizationWithSlugAsync("device-portal");
        var customerId = await CreateCustomerAsync(ownerToken, "Portal Device Customer");
        var (portalUserId, portalToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "device-portal-user@portal.test");

        var (success, _, status) = await PostAsync("/api/v1/portal/device-tokens",
            new { platform = "android", pushToken = "portal-token" }, portalToken);

        success.Should().BeTrue();
        status.Should().Be(HttpStatusCode.NoContent);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var registration = await db.DeviceRegistrations.IgnoreQueryFilters().SingleAsync(d => d.TenantId == orgId && d.OwnerId == portalUserId);

        registration.IsPortalOwner.Should().BeTrue();
        registration.PushToken.Should().Be("portal-token");
    }

    [Fact]
    public async Task PortalUser_CannotRegisterAgainstTheInternalEndpoint_AndViceVersa()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("device-cross-auth");
        var customerId = await CreateCustomerAsync(ownerToken, "Cross Auth Customer");
        var (_, portalToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "device-cross-auth@portal.test");

        var (portalOnInternal, _, portalOnInternalStatus) = await PostAsync("/api/v1/notifications/device-tokens",
            new { platform = "ios", pushToken = "should-not-work" }, portalToken);
        portalOnInternal.Should().BeFalse();
        portalOnInternalStatus.Should().Be(HttpStatusCode.Forbidden);

        var (internalOnPortal, _, internalOnPortalStatus) = await PostAsync("/api/v1/portal/device-tokens",
            new { platform = "ios", pushToken = "should-not-work" }, ownerToken);
        internalOnPortal.Should().BeFalse();
        internalOnPortalStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TenantIsolation_DeviceRegistrationsNeverCrossTenants()
    {
        var (tokenA, orgIdA, _) = await CreateOrganizationAsync("device-iso-a");
        var (tokenB, orgIdB, _) = await CreateOrganizationAsync("device-iso-b");

        (await PostAsync("/api/v1/notifications/device-tokens", new { platform = "ios", pushToken = "a-token" }, tokenA)).Success.Should().BeTrue();
        (await PostAsync("/api/v1/notifications/device-tokens", new { platform = "ios", pushToken = "b-token" }, tokenB)).Success.Should().BeTrue();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var regA = await db.DeviceRegistrations.IgnoreQueryFilters().SingleAsync(d => d.TenantId == orgIdA);
        var regB = await db.DeviceRegistrations.IgnoreQueryFilters().SingleAsync(d => d.TenantId == orgIdB);

        regA.PushToken.Should().Be("a-token");
        regB.PushToken.Should().Be("b-token");
    }
}
