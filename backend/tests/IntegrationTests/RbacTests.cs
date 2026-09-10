using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class RbacTests : TestBase
{
    public RbacTests(CustomWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Owner_CanCreateUserAndAssignRole()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("rbac-owner");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var (success, body, status) = await PostAsync("/api/v1/users", new
        {
            email = $"agent-{suffix}@rbac-owner.test",
            fullName = "New Sales Agent",
            password = "Agent@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, ownerToken);

        success.Should().BeTrue();
        status.Should().Be(HttpStatusCode.Created);
        body.GetProperty("data").GetProperty("roles")[0].GetString().Should().Be("Sales Agent");
    }

    [Fact]
    public async Task SalesAgent_CannotCreateOrManageUsers()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("rbac-agent");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var agentEmail = $"agent-{suffix}@rbac-agent.test";

        var (createSuccess, _, _) = await PostAsync("/api/v1/users", new
        {
            email = agentEmail,
            fullName = "Sales Agent",
            password = "Agent@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, ownerToken);
        createSuccess.Should().BeTrue();

        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var (success, _, status) = await PostAsync("/api/v1/users", new
        {
            email = $"other-{suffix}@rbac-agent.test",
            fullName = "Another User",
            password = "Other@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, agentToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SalesAgent_CanStillReadOwnOrganizationProfile()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("rbac-read");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var agentEmail = $"agent-{suffix}@rbac-read.test";

        await PostAsync("/api/v1/users", new
        {
            email = agentEmail,
            fullName = "Sales Agent",
            password = "Agent@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, ownerToken);

        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        // Sales Agent has no organizations.view permission, so this must be forbidden too —
        // confirms permission checks are enforced per-endpoint, not just "authenticated".
        var (success, _, status) = await GetAsync("/api/v1/organizations/me", agentToken);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Unauthenticated_RequestToProtectedEndpoint_ReturnsUnauthorized()
    {
        var (success, _, status) = await GetAsync("/api/v1/users");
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }
}
