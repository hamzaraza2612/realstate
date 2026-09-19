using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class CrmTests : TestBase
{
    public CrmTests(CustomWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Owner_CanCreateUpdateAndDeleteLead()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("crm-lead-crud");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Jane Prospect",
            email = "jane@prospect.test",
            phone = "555-2000",
            companyName = "Prospect Co",
            source = 0,
            priority = 1,
            notes = "First contact",
            assignedToUserId = (Guid?)null
        }, ownerToken);

        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var leadId = createBody.GetProperty("data").GetProperty("id").GetString()!;
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // New

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/crm/leads/{leadId}", new
        {
            fullName = "Jane Prospect",
            email = "jane@prospect.test",
            phone = "555-2000",
            companyName = "Prospect Co",
            status = 1, // Contacted
            priority = 2, // High
            notes = "Follow-up scheduled"
        }, ownerToken);

        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);
        updateBody.GetProperty("data").GetProperty("priority").GetInt32().Should().Be(2);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/crm/leads/{leadId}", ownerToken);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);

        var (getSuccess, _, getStatus) = await GetAsync($"/api/v1/crm/leads/{leadId}", ownerToken);
        getSuccess.Should().BeFalse();
        getStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Lead_CanBeAssignedAndConvertedToCustomer()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("crm-convert");

        var (_, leadBody, _) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Convert Me",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 1,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, ownerToken);
        var leadId = leadBody.GetProperty("data").GetProperty("id").GetString()!;

        var (convertSuccess, convertBody, _) = await PostAsync($"/api/v1/crm/leads/{leadId}/convert", new { }, ownerToken);
        convertSuccess.Should().BeTrue();
        convertBody.GetProperty("data").GetProperty("fullName").GetString().Should().Be("Convert Me");
        convertBody.GetProperty("data").GetProperty("convertedFromLeadId").GetString().Should().Be(leadId);

        var (leadGetSuccess, leadGetBody, _) = await GetAsync($"/api/v1/crm/leads/{leadId}", ownerToken);
        leadGetSuccess.Should().BeTrue();
        leadGetBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(5); // Won
        leadGetBody.GetProperty("data").GetProperty("convertedToCustomerId").ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Null);

        // Converting the same lead twice must fail — it already has a linked customer.
        var (reconvertSuccess, _, reconvertStatus) = await PostAsync($"/api/v1/crm/leads/{leadId}/convert", new { }, ownerToken);
        reconvertSuccess.Should().BeFalse();
        reconvertStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Activity_MustBeLinkedToLeadOrCustomer()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("crm-activity-link");

        var (success, _, status) = await PostAsync("/api/v1/crm/activities", new
        {
            type = 2,
            subject = "Orphan note",
            description = (string?)null,
            dueDate = (DateTimeOffset?)null,
            leadId = (Guid?)null,
            customerId = (Guid?)null,
            assignedToUserId = (Guid?)null
        }, ownerToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Activity_CanBeCreatedAndCompleted()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("crm-activity-complete");

        var (_, leadBody, _) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Activity Lead",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 0,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, ownerToken);
        var leadId = leadBody.GetProperty("data").GetProperty("id").GetString()!;

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/crm/activities", new
        {
            type = 3, // FollowUp
            subject = "Call back next week",
            description = (string?)null,
            dueDate = DateTimeOffset.UtcNow.AddDays(7),
            leadId = Guid.Parse(leadId),
            customerId = (Guid?)null,
            assignedToUserId = (Guid?)null
        }, ownerToken);
        createSuccess.Should().BeTrue();
        var activityId = createBody.GetProperty("data").GetProperty("id").GetString()!;
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Pending

        var (completeSuccess, completeBody, _) = await PostAsync($"/api/v1/crm/activities/{activityId}/complete", new { }, ownerToken);
        completeSuccess.Should().BeTrue();
        completeBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Completed

        var (recompleteSuccess, _, recompleteStatus) = await PostAsync($"/api/v1/crm/activities/{activityId}/complete", new { }, ownerToken);
        recompleteSuccess.Should().BeFalse();
        recompleteStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Leads_AreIsolatedPerTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("crm-tenant-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("crm-tenant-b");

        var (_, leadBody, _) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Tenant A Lead",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 0,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, tokenA);
        var leadId = leadBody.GetProperty("data").GetProperty("id").GetString()!;

        var (bListSuccess, bListBody, _) = await GetAsync("/api/v1/crm/leads", tokenB);
        bListSuccess.Should().BeTrue();
        bListBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(0);

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/crm/leads/{leadId}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);

        var (aListSuccess, aListBody, _) = await GetAsync("/api/v1/crm/leads", tokenA);
        aListSuccess.Should().BeTrue();
        aListBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task SalesAgent_CannotDeleteLeads_ButCanViewAndCreate()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("crm-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var agentEmail = $"agent-{suffix}@crm-rbac.test";

        await PostAsync("/api/v1/users", new
        {
            email = agentEmail,
            fullName = "CRM Sales Agent",
            password = "Agent@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Agent Created Lead",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 0,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, agentToken);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var leadId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (listSuccess, _, _) = await GetAsync("/api/v1/crm/leads", agentToken);
        listSuccess.Should().BeTrue();

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/crm/leads/{leadId}", agentToken);
        deleteSuccess.Should().BeFalse();
        deleteStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CrmDashboard_ReflectsCurrentTenantDataOnly()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("crm-dashboard-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("crm-dashboard-b");

        await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Dashboard Lead A1",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 0,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, tokenA);
        await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Dashboard Lead A2",
            email = (string?)null,
            phone = (string?)null,
            companyName = (string?)null,
            source = 0,
            priority = 0,
            notes = (string?)null,
            assignedToUserId = (Guid?)null
        }, tokenA);

        var (successA, bodyA, _) = await GetAsync("/api/v1/crm/dashboard", tokenA);
        successA.Should().BeTrue();
        bodyA.GetProperty("data").GetProperty("totalLeads").GetInt32().Should().Be(2);

        var (successB, bodyB, _) = await GetAsync("/api/v1/crm/dashboard", tokenB);
        successB.Should().BeTrue();
        bodyB.GetProperty("data").GetProperty("totalLeads").GetInt32().Should().Be(0);
    }
}
