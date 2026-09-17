using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public abstract class TestBase
{
    protected readonly HttpClient Client;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    protected TestBase(CustomWebApplicationFactory factory)
    {
        Client = factory.CreateClient();
    }

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> PostAsync(string url, object payload, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(payload) };
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var body = string.IsNullOrWhiteSpace(text) ? default : JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);
        return (response.IsSuccessStatusCode, body, response.StatusCode);
    }

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> GetAsync(string url, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var body = string.IsNullOrWhiteSpace(text) ? default : JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);
        return (response.IsSuccessStatusCode, body, response.StatusCode);
    }

    protected async Task<string> LoginAsync(string email, string password)
    {
        var (success, body, status) = await PostAsync("/api/v1/auth/login", new { email, password });
        if (!success) throw new InvalidOperationException($"Login failed for {email}: {status}");
        return body.GetProperty("data").GetProperty("accessToken").GetString()!;
    }

    protected async Task<string> LoginSuperAdminAsync() => await LoginAsync("superadmin@realestate-erp.local", "ChangeMe@123");

    /// <summary>Creates a fresh org (with a unique slug/owner email) via the platform API and returns the owner's access token plus org id.</summary>
    protected async Task<(string OwnerToken, Guid OrgId, string OwnerEmail)> CreateOrganizationAsync(string namePrefix)
    {
        var superAdminToken = await LoginSuperAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var slug = $"{namePrefix}-{suffix}".ToLowerInvariant();
        var ownerEmail = $"owner-{suffix}@{namePrefix}.test";

        var (success, body, status) = await PostAsync("/api/v1/platform/organizations", new
        {
            name = $"{namePrefix} {suffix}",
            slug,
            contactEmail = (string?)null,
            contactPhone = (string?)null,
            timezone = "UTC",
            subscriptionPlanId = (Guid?)null,
            ownerEmail,
            ownerFullName = $"{namePrefix} Owner",
            ownerPassword = "Owner@12345"
        }, superAdminToken);

        if (!success) throw new InvalidOperationException($"Failed to create org: {status} {body}");

        var orgId = Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
        var ownerToken = await LoginAsync(ownerEmail, "Owner@12345");
        return (ownerToken, orgId, ownerEmail);
    }
}
