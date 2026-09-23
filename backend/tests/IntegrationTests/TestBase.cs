using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public abstract class TestBase
{
    protected readonly HttpClient Client;
    protected readonly CustomWebApplicationFactory Factory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    protected TestBase(CustomWebApplicationFactory factory)
    {
        Factory = factory;
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

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> PutAsync(string url, object payload, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, url) { Content = JsonContent.Create(payload) };
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var body = string.IsNullOrWhiteSpace(text) ? default : JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);
        return (response.IsSuccessStatusCode, body, response.StatusCode);
    }

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> DeleteAsync(string url, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var body = string.IsNullOrWhiteSpace(text) ? default : JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);
        return (response.IsSuccessStatusCode, body, response.StatusCode);
    }

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> PostFormAsync(
        string url, IDictionary<string, string> fields, (byte[] Bytes, string FileName, string ContentType)? file, string? token = null)
    {
        using var content = new MultipartFormDataContent();
        foreach (var (key, value) in fields)
        {
            content.Add(new StringContent(value), key);
        }
        if (file is { } f)
        {
            var fileContent = new ByteArrayContent(f.Bytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(f.ContentType);
            content.Add(fileContent, "File", f.FileName);
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var body = string.IsNullOrWhiteSpace(text) ? default : JsonSerializer.Deserialize<JsonElement>(text, JsonOptions);
        return (response.IsSuccessStatusCode, body, response.StatusCode);
    }

    protected async Task<(bool Success, byte[] Bytes, System.Net.HttpStatusCode Status, string? ContentType)> GetBytesAsync(string url, string? token = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await Client.SendAsync(request);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        return (response.IsSuccessStatusCode, bytes, response.StatusCode, response.Content.Headers.ContentType?.MediaType);
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

    /// <summary>Same as CreateOrganizationAsync but also returns the tenant slug, needed for portal login
    /// (portal accounts are looked up by (TenantSlug, Email) since portal email uniqueness is tenant-scoped).</summary>
    protected async Task<(string OwnerToken, Guid OrgId, string OwnerEmail, string Slug)> CreateOrganizationWithSlugAsync(string namePrefix)
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
        return (ownerToken, orgId, ownerEmail, slug);
    }

    /// <summary>Directly sets a PortalUser's password hash so tests can log in without needing to
    /// intercept the invite/reset email (LoggingEmailSender only logs; it exposes nothing to HTTP callers).</summary>
    protected async Task SetPortalPasswordAsync(Guid portalUserId, string password)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RealEstateErp.Infrastructure.Persistence.AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<RealEstateErp.Domain.Portal.PortalUser>>();
        var user = await db.PortalUsers.IgnoreQueryFilters().FirstAsync(u => u.Id == portalUserId);
        user.PasswordHash = hasher.HashPassword(user, password);
        user.EmailConfirmed = true;
        await db.SaveChangesAsync();
    }

    protected async Task<(bool Success, JsonElement Body, System.Net.HttpStatusCode Status)> PortalLoginAsync(string tenantSlug, string email, string password)
        => await PostAsync("/api/v1/portal/auth/login", new { tenantSlug, email, password });
}
