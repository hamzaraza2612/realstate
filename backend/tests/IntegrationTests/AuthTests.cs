using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class AuthTests : TestBase
{
    public AuthTests(CustomWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Login_WithValidSuperAdminCredentials_ReturnsAccessAndRefreshTokens()
    {
        var (success, body, _) = await PostAsync("/api/v1/auth/login", new
        {
            email = "superadmin@realestate-erp.local",
            password = "ChangeMe@123"
        });

        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("data").GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("data").GetProperty("user").GetProperty("isSuperAdmin").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var (success, _, status) = await PostAsync("/api/v1/auth/login", new
        {
            email = "superadmin@realestate-erp.local",
            password = "WrongPassword123"
        });

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_ReturnsUnauthorized()
    {
        var (success, _, status) = await PostAsync("/api/v1/auth/login", new
        {
            email = "nobody@nowhere.test",
            password = "Whatever123"
        });

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WithValidToken_IssuesNewTokensAndRevokesOld()
    {
        var (_, orgId, ownerEmail) = await CreateOrganizationAsync("refresh-org");
        var (_, loginBody, _) = await PostAsync("/api/v1/auth/login", new { email = ownerEmail, password = "Owner@12345" });
        var refreshToken = loginBody.GetProperty("data").GetProperty("refreshToken").GetString()!;
        orgId.Should().NotBeEmpty();

        var (success, body, _) = await PostAsync("/api/v1/auth/refresh", new { refreshToken });
        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();

        // The rotated-out refresh token must no longer be usable.
        var (reuseSuccess, _, reuseStatus) = await PostAsync("/api/v1/auth/refresh", new { refreshToken });
        reuseSuccess.Should().BeFalse();
        reuseStatus.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WithInvalidToken_ReturnsUnauthorized()
    {
        var (success, _, status) = await PostAsync("/api/v1/auth/refresh", new { refreshToken = "not-a-real-token" });
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Unauthorized);
    }
}
