using System.Net;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Application.Ai;
using RealEstateErp.Domain.Ai;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.IntegrationTests.Ai;

namespace RealEstateErp.IntegrationTests;

/// <summary>
/// Milestone 16 — AI Business Intelligence / Command Center. Every test here runs against
/// FakeAiProvider (see its doc comment): this sandbox has no ANTHROPIC_API_KEY, so nothing in this
/// file is, or claims to be, a live external-model test. What IS exercised end to end against the
/// real API pipeline: tenant/user conversation isolation, per-tool permission re-checking (even when
/// the fake model tries to call a tool its user isn't authorized for), the fact-vs-narrative
/// hallucination defense, the full propose→approve→execute write-action pipeline reusing the existing
/// generic Approval Inbox, idempotent re-execution, expiry, and the "ai" plan entitlement gate.
/// </summary>
[Collection("Integration")]
public class AiCommandCenterTests : TestBase
{
    public AiCommandCenterTests(CustomWebApplicationFactory factory) : base(factory)
    {
        // xUnit constructs a fresh test class instance per [Fact], so resetting the shared singleton
        // here — once, not on every access — gives each test a clean scripted-response queue without
        // wiping out responses a test enqueued earlier in its own run.
        Fake.Reset();
    }

    private FakeAiProvider Fake => (FakeAiProvider)Factory.Services.GetRequiredService<IAiProvider>();

    private async Task<Guid> CreateConversationAsync(string token)
    {
        var (success, body, status) = await PostAsync("/api/v1/ai/conversations", new { title = (string?)null }, token);
        success.Should().BeTrue($"conversation creation should succeed: {status} {body}");
        return Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
    }

    private async Task<string> CreateUserWithRoleAsync(string ownerToken, string emailPrefix, string roleName)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"{emailPrefix}-{suffix}@ai-tests.test";
        var (success, _, status) = await PostAsync("/api/v1/users", new
        {
            email, fullName = emailPrefix, password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { roleName }
        }, ownerToken);
        success.Should().BeTrue($"user creation should succeed: {status}");
        return await LoginAsync(email, "Agent@12345");
    }

    private async Task<Guid> CreateLeadAsync(string token)
    {
        var (success, body, status) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "AI Test Lead", email = (string?)null, phone = (string?)null, companyName = (string?)null,
            source = 0, priority = 1, notes = (string?)null, assignedToUserId = (Guid?)null
        }, token);
        success.Should().BeTrue($"lead creation should succeed: {status} {body}");
        return Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
    }

    private async Task<Guid> GetUserIdAsync(string email)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == email);
        return user.Id;
    }

    /// <summary>ExecuteInternalAsync (like every ordinary service method) relies on AppDbContext's
    /// ambient tenant query filter, which in production is always populated from the current HTTP
    /// request's JWT claims — it's only ever called mid-request, from AiActionProposalApprovalHandler
    /// during a real POST /api/v1/approvals/{id}/decide call. A test that resolves it from a bare
    /// CreateScope() has no HttpContext at all, so TenantContext.TenantId comes back null and the
    /// filter matches nothing. This fakes exactly the claims a real request would carry, the same way
    /// AuthController populates the JWT, so the direct service call behaves identically to production.</summary>
    private async Task<T> RunInTenantScopeAsync<T>(Guid tenantId, Guid userId, Func<IServiceProvider, Task<T>> action)
    {
        using var scope = Factory.Services.CreateScope();
        var accessor = scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>();
        accessor.HttpContext = new DefaultHttpContext
        {
            RequestServices = scope.ServiceProvider,
            User = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim("tenant_id", tenantId.ToString()),
                new Claim("sub", userId.ToString()),
            }, "Test")),
        };
        try
        {
            return await action(scope.ServiceProvider);
        }
        finally
        {
            accessor.HttpContext = null;
        }
    }

    // ---- Command Center ----

    [Fact]
    public async Task CommandCenter_Summary_ReturnsHealthAttentionAndProviderStatus()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-summary");

        var (success, body, status) = await GetAsync("/api/v1/ai/command-center/summary", ownerToken);

        success.Should().BeTrue($"{status} {body}");
        body.GetProperty("data").GetProperty("aiProviderConfigured").GetBoolean().Should().BeTrue();
        body.GetProperty("data").GetProperty("health").GetProperty("overall").ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Undefined);
        body.GetProperty("data").GetProperty("attentionItems").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Array);
    }

    [Fact]
    public async Task Ask_WhenProviderNotConfigured_Returns503()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-unconfigured");
        var conversationId = await CreateConversationAsync(ownerToken);
        Fake.IsConfigured = false;

        var (success, body, status) = await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "What is my revenue?" }, ownerToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.ServiceUnavailable);
        body.GetProperty("code").GetString().Should().Be("ai_provider_not_configured");
    }

    // ---- Authorization ----

    [Fact]
    public async Task User_WithoutAiPermission_CannotCreateConversation()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-noperm");
        var agentToken = await CreateUserWithRoleAsync(ownerToken, "agent", "Sales Agent");

        var (success, _, status) = await PostAsync("/api/v1/ai/conversations", new { title = (string?)null }, agentToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Ask_ToolRequiringFinancePermission_IsDeniedEvenIfModelRequestsIt()
    {
        // Sales Manager has Ai.View but not Finance.ReportsView (see DbSeeder) — this proves
        // AiConversationService re-checks the tool's own permission independently, not just
        // trusting that the caller passed the controller's entitlement/Ai.View gate.
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-finance-deny");
        var salesManagerToken = await CreateUserWithRoleAsync(ownerToken, "salesmgr", "Sales Manager");
        var conversationId = await CreateConversationAsync(salesManagerToken);

        Fake.EnqueueToolUse("finance.receivables_aging", new { });
        Fake.EnqueueFinalText("Here is your receivables summary.");

        var (success, body, status) = await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "What are my overdue receivables?" }, salesManagerToken);

        success.Should().BeTrue($"{status} {body}");
        // Denied at tool-execution time, not a hard failure of the whole turn — no facts were ever
        // populated from the (unauthorized) tool call.
        var facts = body.GetProperty("data").GetProperty("facts");
        facts.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task Conversation_IsNotVisibleToAnotherTenant()
    {
        var (ownerAToken, _, _) = await CreateOrganizationAsync("cc-tenant-a");
        var (ownerBToken, _, _) = await CreateOrganizationAsync("cc-tenant-b");
        var conversationId = await CreateConversationAsync(ownerAToken);

        var (success, _, status) = await GetAsync($"/api/v1/ai/conversations/{conversationId}", ownerBToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Conversation_IsNotVisibleToAnotherUserInTheSameTenant()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-user-iso");
        var conversationId = await CreateConversationAsync(ownerToken);
        var otherOwnerLikeToken = await CreateUserWithRoleAsync(ownerToken, "otheradmin", "Organization Admin");

        var (success, _, status) = await GetAsync($"/api/v1/ai/conversations/{conversationId}", otherOwnerLikeToken);

        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Hallucination defense ----

    [Fact]
    public async Task AskResponse_Facts_ReflectToolResult_RegardlessOfModelNarrative()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-facts");
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("finance.receivables_aging", new { });
        // Deliberately a fabricated, wrong number in the narrative text — FactsJson must still come
        // from the tool's actual (real, deterministic) return value, never from this text.
        Fake.EnqueueFinalText("Great news — receivables are effectively zero, nothing to worry about.");

        var (success, body, status) = await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "What are my overdue receivables?" }, ownerToken);

        success.Should().BeTrue($"{status} {body}");
        var facts = body.GetProperty("data").GetProperty("facts");
        facts.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Array);
        var firstFact = facts[0];
        firstFact.GetProperty("tool").GetString().Should().Be("finance.receivables_aging");
        // The tool's own shape — TotalOutstanding — must be present verbatim, proving this came from
        // the real reporting service and not from parsing the model's prose.
        firstFact.GetProperty("data").TryGetProperty("TotalOutstanding", out _).Should().BeTrue();
    }

    [Fact]
    public async Task MalformedToolCall_ToUnknownTool_DoesNotCrashAndDoesNotProduceFacts()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-malformed");
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("no_such_tool_exists", new { anything = "goes" });
        Fake.EnqueueFinalText("Done.");

        var (success, body, status) = await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "Do something undefined." }, ownerToken);

        success.Should().BeTrue($"{status} {body}");
        body.GetProperty("data").GetProperty("facts").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    // ---- Write-action propose/approve/execute pipeline ----

    [Fact]
    public async Task WriteAction_IsProposedNotExecuted_ThenApprovalExecutesIt()
    {
        var (ownerToken, tenantId, ownerEmail) = await CreateOrganizationAsync("cc-write-approve");
        var leadId = await CreateLeadAsync(ownerToken);
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("crm.create_follow_up", new { leadId = leadId.ToString(), subject = "Call the lead back" });
        Fake.EnqueueFinalText("I've prepared a follow-up for your approval.");

        var (askSuccess, askBody, askStatus) = await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "Follow up with this lead." }, ownerToken);
        askSuccess.Should().BeTrue($"{askStatus} {askBody}");

        var (listSuccess, listBody, _) = await GetAsync("/api/v1/ai/action-proposals", ownerToken);
        listSuccess.Should().BeTrue();
        var proposals = listBody.GetProperty("data").EnumerateArray().ToList();
        proposals.Should().ContainSingle(p => p.GetProperty("actionType").GetString() == "crm.create_follow_up");
        var proposal = proposals.First(p => p.GetProperty("actionType").GetString() == "crm.create_follow_up");
        var proposalId = Guid.Parse(proposal.GetProperty("id").GetString()!);
        proposal.GetProperty("status").GetInt32().Should().Be((int)AiActionProposalStatus.PendingApproval);
        var approvalRequestId = Guid.Parse(proposal.GetProperty("approvalRequestId").GetString()!);

        // Not yet executed — no Activity exists for the lead yet.
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Activities.IgnoreQueryFilters().AnyAsync(a => a.LeadId == leadId)).Should().BeFalse();
        }

        var (decideSuccess, decideBody, decideStatus) = await PostAsync($"/api/v1/approvals/{approvalRequestId}/decide", new { approve = true, decisionComments = (string?)null }, ownerToken);
        decideSuccess.Should().BeTrue($"{decideStatus} {decideBody}");

        var (getSuccess, getBody, _) = await GetAsync($"/api/v1/ai/action-proposals/{proposalId}", ownerToken);
        getSuccess.Should().BeTrue();
        getBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be((int)AiActionProposalStatus.Executed);
        getBody.GetProperty("data").GetProperty("result").ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Null);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Activities.IgnoreQueryFilters().CountAsync(a => a.LeadId == leadId)).Should().Be(1);
        }

        // Duplicate execution request (simulating a retried/duplicated decision) must be idempotent —
        // it must not create a second Activity.
        var ownerUserId = await GetUserIdAsync(ownerEmail);
        var repeat = await RunInTenantScopeAsync(tenantId, ownerUserId, sp =>
            sp.GetRequiredService<IAiActionProposalService>().ExecuteInternalAsync(proposalId, ownerUserId, CancellationToken.None));
        repeat.Succeeded.Should().BeTrue();

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Activities.IgnoreQueryFilters().CountAsync(a => a.LeadId == leadId)).Should().Be(1, "a duplicate execution request must be idempotent, never a second mutation");
        }
    }

    [Fact]
    public async Task WriteAction_Rejected_NeverExecutes()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-write-reject");
        var leadId = await CreateLeadAsync(ownerToken);
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("crm.create_follow_up", new { leadId = leadId.ToString(), subject = "Call the lead back" });
        Fake.EnqueueFinalText("I've prepared a follow-up for your approval.");
        await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "Follow up with this lead." }, ownerToken);

        var (_, listBody, _) = await GetAsync("/api/v1/ai/action-proposals", ownerToken);
        var proposal = listBody.GetProperty("data").EnumerateArray().First(p => p.GetProperty("actionType").GetString() == "crm.create_follow_up");
        var proposalId = Guid.Parse(proposal.GetProperty("id").GetString()!);
        var approvalRequestId = Guid.Parse(proposal.GetProperty("approvalRequestId").GetString()!);

        var (decideSuccess, _, _) = await PostAsync($"/api/v1/approvals/{approvalRequestId}/decide", new { approve = false, decisionComments = "Not needed" }, ownerToken);
        decideSuccess.Should().BeTrue();

        var (_, getBody, _) = await GetAsync($"/api/v1/ai/action-proposals/{proposalId}", ownerToken);
        getBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be((int)AiActionProposalStatus.Rejected);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Activities.IgnoreQueryFilters().AnyAsync(a => a.LeadId == leadId)).Should().BeFalse();
    }

    [Fact]
    public async Task WriteAction_Expired_CannotBeExecuted()
    {
        var (ownerToken, tenantId, ownerEmail) = await CreateOrganizationAsync("cc-write-expired");
        var leadId = await CreateLeadAsync(ownerToken);
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("crm.create_follow_up", new { leadId = leadId.ToString(), subject = "Call the lead back" });
        Fake.EnqueueFinalText("Prepared.");
        await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "Follow up." }, ownerToken);

        var (_, listBody, _) = await GetAsync("/api/v1/ai/action-proposals", ownerToken);
        var proposalId = Guid.Parse(listBody.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("actionType").GetString() == "crm.create_follow_up").GetProperty("id").GetString()!);

        var ownerUserId = await GetUserIdAsync(ownerEmail);
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var proposal = await db.AiActionProposals.IgnoreQueryFilters().FirstAsync(p => p.Id == proposalId);
            proposal.ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1);
            await db.SaveChangesAsync();
        }

        var result = await RunInTenantScopeAsync(tenantId, ownerUserId, sp =>
            sp.GetRequiredService<IAiActionProposalService>().ExecuteInternalAsync(proposalId, ownerUserId, CancellationToken.None));
        result.Succeeded.Should().BeFalse();
        result.ErrorCode.Should().Be("expired");

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Activities.IgnoreQueryFilters().AnyAsync(a => a.LeadId == leadId)).Should().BeFalse();
            (await db.AiActionProposals.IgnoreQueryFilters().FirstAsync(p => p.Id == proposalId)).Status.Should().Be(AiActionProposalStatus.Expired);
        }
    }

    [Fact]
    public async Task AiAction_CreatesAuditRecords_ForProposeAndExecute()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("cc-audit");
        var leadId = await CreateLeadAsync(ownerToken);
        var conversationId = await CreateConversationAsync(ownerToken);

        Fake.EnqueueToolUse("crm.create_follow_up", new { leadId = leadId.ToString(), subject = "Call back" });
        Fake.EnqueueFinalText("Prepared.");
        await PostAsync($"/api/v1/ai/conversations/{conversationId}/messages", new { question = "Follow up." }, ownerToken);

        var (_, listBody, _) = await GetAsync("/api/v1/ai/action-proposals", ownerToken);
        var proposal = listBody.GetProperty("data").EnumerateArray().First(p => p.GetProperty("actionType").GetString() == "crm.create_follow_up");
        var approvalRequestId = Guid.Parse(proposal.GetProperty("approvalRequestId").GetString()!);
        await PostAsync($"/api/v1/approvals/{approvalRequestId}/decide", new { approve = true, decisionComments = (string?)null }, ownerToken);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditActions = await db.AuditLogs.IgnoreQueryFilters()
            .Where(a => a.Module == "Ai" && a.EntityType == "AiActionProposal")
            .Select(a => a.Action).ToListAsync();
        auditActions.Should().Contain("Propose");
        auditActions.Should().Contain("Execute");
    }

    // ---- Entitlement gating ----

    [Fact]
    public async Task AiEntitlementDisabled_BlocksCommandCenter_ButRestOfErpStillWorks()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, orgId, _) = await CreateOrganizationAsync("cc-no-entitlement");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var (planSuccess, planBody, _) = await PostAsync("/api/v1/platform/subscription-plans", new
        {
            name = $"NoAi Plan {suffix}", code = $"no-ai-{suffix}", description = (string?)null, displayOrder = 0,
            trialDays = 0, currency = "USD", price = 10m, setupPrice = (decimal?)null, billingCycle = 0, metadataJson = (string?)null,
            entitlements = new[] { new { code = "ai", boolValue = false, numericValue = (long?)null } }
        }, superAdmin);
        planSuccess.Should().BeTrue();
        var planId = Guid.Parse(planBody.GetProperty("data").GetProperty("id").GetString()!);

        var (assignSuccess, _, _) = await PostAsync($"/api/v1/platform/organizations/{orgId}/subscription", new { planId, skipTrial = true }, superAdmin);
        assignSuccess.Should().BeTrue();

        var (aiSuccess, _, aiStatus) = await GetAsync("/api/v1/ai/command-center/summary", ownerToken);
        aiSuccess.Should().BeFalse();
        aiStatus.Should().Be(HttpStatusCode.Forbidden);

        // The rest of the ERP must keep working — no cascading failure from disabling one feature.
        var (orgSuccess, _, orgStatus) = await GetAsync("/api/v1/organizations/me", ownerToken);
        orgSuccess.Should().BeTrue($"{orgStatus}");
    }
}
