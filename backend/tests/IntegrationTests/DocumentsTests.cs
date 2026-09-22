using System.Net;
using System.Text;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class DocumentsTests : TestBase
{
    public DocumentsTests(CustomWebApplicationFactory factory) : base(factory) { }

    private static readonly byte[] ValidPdfBytes = Encoding.ASCII.GetBytes("%PDF-1.4\n%fake pdf content for tests\n");
    private static readonly byte[] FakePdfBytes = Encoding.ASCII.GetBytes("this is not really a pdf");

    private async Task<string> CreateCustomerAsync(string token, string name)
    {
        var (_, body, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = name, email = (string?)null, phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private Dictionary<string, string> UploadFields(string entityType, string entityId, string title, int category = 0) => new()
    {
        ["EntityType"] = entityType,
        ["EntityId"] = entityId,
        ["Category"] = category.ToString(),
        ["Title"] = title,
        ["Description"] = "",
    };

    [Fact]
    public async Task Upload_Download_And_VersionHistory_RoundTripCorrectly()
    {
        var (token, _, _) = await CreateOrganizationAsync("doc-upload");
        var customerId = await CreateCustomerAsync(token, "Doc Customer");

        var (uploadSuccess, uploadBody, uploadStatus) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "ID Card"),
            (ValidPdfBytes, "id-card.pdf", "application/pdf"), token);
        uploadSuccess.Should().BeTrue();
        uploadStatus.Should().Be(HttpStatusCode.Created);
        var documentId = uploadBody.GetProperty("data").GetProperty("id").GetString()!;
        uploadBody.GetProperty("data").GetProperty("latestVersionNumber").GetInt32().Should().Be(1);

        var (downloadSuccess, bytes, downloadStatus, contentType) = await GetBytesAsync($"/api/v1/documents/{documentId}/download", token);
        downloadSuccess.Should().BeTrue();
        downloadStatus.Should().Be(HttpStatusCode.OK);
        contentType.Should().Be("application/pdf");
        bytes.Should().BeEquivalentTo(ValidPdfBytes);

        // Add a second version — the original stays retrievable by version number.
        var (versionSuccess, versionBody, _) = await PostFormAsync(
            $"/api/v1/documents/{documentId}/versions", new Dictionary<string, string>(),
            (ValidPdfBytes.Concat(Encoding.ASCII.GetBytes(" v2")).ToArray(), "id-card-v2.pdf", "application/pdf"), token);
        versionSuccess.Should().BeTrue();
        versionBody.GetProperty("data").GetProperty("versionNumber").GetInt32().Should().Be(2);

        var (detailSuccess, detailBody, _) = await GetAsync($"/api/v1/documents/{documentId}", token);
        detailSuccess.Should().BeTrue();
        detailBody.GetProperty("data").GetProperty("document").GetProperty("latestVersionNumber").GetInt32().Should().Be(2);
        detailBody.GetProperty("data").GetProperty("versions").GetArrayLength().Should().Be(2);

        var (_, v1Bytes, _, _) = await GetBytesAsync($"/api/v1/documents/{documentId}/download?version=1", token);
        v1Bytes.Should().BeEquivalentTo(ValidPdfBytes);
    }

    [Fact]
    public async Task Download_CrossTenantAccess_IsDenied()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("doc-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("doc-iso-b");
        var customerId = await CreateCustomerAsync(tokenA, "Tenant A Customer");

        var (_, uploadBody, _) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "Confidential"),
            (ValidPdfBytes, "file.pdf", "application/pdf"), tokenA);
        var documentId = uploadBody.GetProperty("data").GetProperty("id").GetString()!;

        var (bSuccess, _, bStatus, _) = await GetBytesAsync($"/api/v1/documents/{documentId}/download", tokenB);
        bSuccess.Should().BeFalse();
        bStatus.Should().Be(HttpStatusCode.NotFound);

        var (bListSuccess, bListBody, _) = await GetAsync($"/api/v1/documents?entityType=Customer&entityId={customerId}", tokenB);
        bListSuccess.Should().BeTrue();
        bListBody.GetProperty("data").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Upload_RejectsUnsupportedFileType_AndOversizedFile()
    {
        var (token, _, _) = await CreateOrganizationAsync("doc-invalid");
        var customerId = await CreateCustomerAsync(token, "Invalid File Customer");

        var (unsupportedSuccess, _, unsupportedStatus) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "Executable"),
            (new byte[] { 0x4D, 0x5A }, "malware.exe", "application/x-msdownload"), token);
        unsupportedSuccess.Should().BeFalse();
        unsupportedStatus.Should().Be(HttpStatusCode.BadRequest);

        var oversized = new byte[26 * 1024 * 1024];
        var (oversizedSuccess, _, oversizedStatus) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "Too Big"),
            (oversized, "big.pdf", "application/pdf"), token);
        oversizedSuccess.Should().BeFalse();
        oversizedStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_RejectsContentThatDoesNotMatchDeclaredType()
    {
        var (token, _, _) = await CreateOrganizationAsync("doc-mime-spoof");
        var customerId = await CreateCustomerAsync(token, "Mime Spoof Customer");

        var (success, body, status) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "Fake PDF"),
            (FakePdfBytes, "fake.pdf", "application/pdf"), token);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
        body.GetProperty("code").GetString().Should().Be("content_type_mismatch");
    }

    [Fact]
    public async Task Upload_RejectsUnknownEntityType()
    {
        var (token, _, _) = await CreateOrganizationAsync("doc-unknown-entity");

        var (success, _, status) = await PostFormAsync(
            "/api/v1/documents", UploadFields("NotARealEntity", Guid.NewGuid().ToString(), "Whatever"),
            (ValidPdfBytes, "file.pdf", "application/pdf"), token);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_RemovesDocumentAndMakesItUnretrievable_AndRequiresManagePermission()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("doc-delete");
        var customerId = await CreateCustomerAsync(ownerToken, "Delete Customer");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var (_, uploadBody, _) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "To Delete"),
            (ValidPdfBytes, "delete-me.pdf", "application/pdf"), ownerToken);
        var documentId = uploadBody.GetProperty("data").GetProperty("id").GetString()!;

        // A Sales Agent has no documents.manage permission — delete must be forbidden.
        var agentEmail = $"agent-{suffix}@doc-delete.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var (agentDeleteSuccess, _, agentDeleteStatus) = await DeleteAsync($"/api/v1/documents/{documentId}", agentToken);
        agentDeleteSuccess.Should().BeFalse();
        agentDeleteStatus.Should().Be(HttpStatusCode.Forbidden);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/documents/{documentId}", ownerToken);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);

        var (getSuccess, _, getStatus) = await GetAsync($"/api/v1/documents/{documentId}", ownerToken);
        getSuccess.Should().BeFalse();
        getStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AuditLog_RecordsDocumentUploadAndDownload()
    {
        var (token, _, _) = await CreateOrganizationAsync("doc-audit");
        var customerId = await CreateCustomerAsync(token, "Audit Customer");

        var (_, uploadBody, _) = await PostFormAsync(
            "/api/v1/documents", UploadFields("Customer", customerId, "Audited Doc"),
            (ValidPdfBytes, "audited.pdf", "application/pdf"), token);
        var documentId = uploadBody.GetProperty("data").GetProperty("id").GetString()!;
        await GetBytesAsync($"/api/v1/documents/{documentId}/download", token);

        var (success, body, _) = await GetAsync("/api/v1/audit-logs?module=Documents", token);
        success.Should().BeTrue();
        var actions = body.GetProperty("data").EnumerateArray().Select(e => e.GetProperty("action").GetString()).ToList();
        actions.Should().Contain("Upload");
        actions.Should().Contain("Download");
    }
}
