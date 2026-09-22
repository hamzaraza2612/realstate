using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class NotificationsApprovalsCommunicationTests : TestBase
{
    public NotificationsApprovalsCommunicationTests(CustomWebApplicationFactory factory) : base(factory) { }

    private async Task<string> CreateProjectAsync(string token, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/projects", new
        {
            name = $"Project {code}", code, type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            startDate = (DateOnly?)null, endDate = (DateOnly?)null, latitude = (decimal?)null, longitude = (decimal?)null, geoJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateExpenseAsync(string token, string projectId, decimal amount = 1000m)
    {
        var (_, body, _) = await PostAsync("/api/v1/construction/expenses", new
        {
            projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, category = 0, amount,
            expenseDate = DateOnly.FromDateTime(DateTime.UtcNow), vendorId = (Guid?)null, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    // ===== Approvals =====

    [Fact]
    public async Task Approval_IsCreatedOnExpenseSubmission_AppearsInApproverInbox_AndApprovingItAlsoApprovesTheExpense()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-expense");
        var projectId = await CreateProjectAsync(ownerToken, "APPREXP");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        var (_, inboxBody, _) = await GetAsync("/api/v1/approvals/inbox", ownerToken);
        var pending = inboxBody.GetProperty("data").EnumerateArray()
            .First(a => a.GetProperty("entityType").GetString() == "Expense" && a.GetProperty("entityId").GetString() == expenseId);
        pending.GetProperty("status").GetInt32().Should().Be(0); // Pending
        var approvalId = pending.GetProperty("id").GetString()!;

        var (decideSuccess, decideBody, _) = await PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = true, decisionComments = "Looks fine" }, ownerToken);
        decideSuccess.Should().BeTrue();
        decideBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Approved

        var (_, expenseBody, _) = await GetAsync($"/api/v1/construction/expenses/{expenseId}", ownerToken);
        expenseBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Approved — deciding via the generic inbox dispatches to the registered ExpenseApprovalHandler
    }

    [Fact]
    public async Task Approval_ResolvingItViaTheModulesOwnEndpoint_AlsoResolvesTheApprovalRequest()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-module-resolve");
        var projectId = await CreateProjectAsync(ownerToken, "APPRMOD");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        var (approveSuccess, _, _) = await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken);
        approveSuccess.Should().BeTrue();

        var (_, historyBody, _) = await GetAsync($"/api/v1/approvals/entity?entityType=Expense&entityId={expenseId}", ownerToken);
        var history = historyBody.GetProperty("data").EnumerateArray().ToList();
        history.Should().HaveCount(1);
        history[0].GetProperty("status").GetInt32().Should().Be(1); // Approved
        history[0].GetProperty("decidedByUserId").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Approval_UnauthorizedApprover_CannotDecide()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-unauth");
        var projectId = await CreateProjectAsync(ownerToken, "APPRUN");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var (_, inboxBody, _) = await GetAsync("/api/v1/approvals/inbox", ownerToken);
        var approvalId = inboxBody.GetProperty("data").EnumerateArray()
            .First(a => a.GetProperty("entityId").GetString() == expenseId).GetProperty("id").GetString()!;

        // A Sales Agent holds neither procurement.order.approve nor is the named approver.
        var agentEmail = $"agent-{suffix}@appr-unauth.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var (decideSuccess, _, decideStatus) = await PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = true, decisionComments = (string?)null }, agentToken);
        decideSuccess.Should().BeFalse();
        decideStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Approval_DuplicateDecision_IsRejected()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-duplicate");
        var projectId = await CreateProjectAsync(ownerToken, "APPRDUP");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        var (_, inboxBody, _) = await GetAsync("/api/v1/approvals/inbox", ownerToken);
        var approvalId = inboxBody.GetProperty("data").EnumerateArray()
            .First(a => a.GetProperty("entityId").GetString() == expenseId).GetProperty("id").GetString()!;

        var (firstSuccess, _, _) = await PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = true, decisionComments = (string?)null }, ownerToken);
        firstSuccess.Should().BeTrue();

        var (secondSuccess, _, secondStatus) = await PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = false, decisionComments = (string?)null }, ownerToken);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Approval_ConcurrentDecisions_OnlyOneWins()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-concurrent");
        var projectId = await CreateProjectAsync(ownerToken, "APPRCON");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        var (_, inboxBody, _) = await GetAsync("/api/v1/approvals/inbox", ownerToken);
        var approvalId = inboxBody.GetProperty("data").EnumerateArray()
            .First(a => a.GetProperty("entityId").GetString() == expenseId).GetProperty("id").GetString()!;

        var task1 = PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = true, decisionComments = "First" }, ownerToken);
        var task2 = PostAsync($"/api/v1/approvals/{approvalId}/decide", new { approve = false, decisionComments = "Second" }, ownerToken);
        var results = await Task.WhenAll(task1, task2);

        results.Count(r => r.Success).Should().Be(1);
        results.Count(r => !r.Success).Should().Be(1);

        var (_, finalBody, _) = await GetAsync($"/api/v1/approvals/{approvalId}", ownerToken);
        finalBody.GetProperty("data").GetProperty("status").GetInt32().Should().BeOneOf(1, 2); // Approved or Rejected, but exactly one decision stuck
    }

    [Fact]
    public async Task Approval_TenantIsolation_InboxAndHistoryNeverCrossTenants()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("appr-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("appr-iso-b");
        var projectIdA = await CreateProjectAsync(tokenA, "APPRISOA");
        var expenseIdA = await CreateExpenseAsync(tokenA, projectIdA);

        var (_, inboxBodyB, _) = await GetAsync("/api/v1/approvals/inbox", tokenB);
        inboxBodyB.GetProperty("data").EnumerateArray().Any(a => a.GetProperty("entityId").GetString() == expenseIdA).Should().BeFalse();

        var (historySuccessB, historyBodyB, _) = await GetAsync($"/api/v1/approvals/entity?entityType=Expense&entityId={expenseIdA}", tokenB);
        historySuccessB.Should().BeTrue();
        historyBodyB.GetProperty("data").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task AuditLog_RecordsApprovalCreateAndDecision()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("appr-audit");
        var projectId = await CreateProjectAsync(ownerToken, "APPRAUD");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);
        await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken);

        var (success, body, _) = await GetAsync("/api/v1/audit-logs?module=Approvals", ownerToken);
        success.Should().BeTrue();
        var actions = body.GetProperty("data").EnumerateArray().Select(e => e.GetProperty("action").GetString()).ToList();
        actions.Should().Contain("Create");
        actions.Should().Contain("Approve");
    }

    // ===== Notifications (triggered by the approval flow above — proves ICommunicationService end to end) =====

    [Fact]
    public async Task Notification_IsCreatedForRequesterOnApprovalDecision_AndSupportsReadUnread()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("notif-basic");
        var projectId = await CreateProjectAsync(ownerToken, "NOTIFBAS");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        var (_, beforeUnreadBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        var beforeUnread = beforeUnreadBody.GetProperty("data").GetInt32();

        await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken);

        var (_, afterUnreadBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        afterUnreadBody.GetProperty("data").GetInt32().Should().Be(beforeUnread + 1);

        var (_, listBody, _) = await GetAsync("/api/v1/notifications?unreadOnly=true", ownerToken);
        var notification = listBody.GetProperty("data").EnumerateArray().First(n => n.GetProperty("entityId").GetString() == expenseId);
        notification.GetProperty("isRead").GetBoolean().Should().BeFalse();
        var notificationId = notification.GetProperty("id").GetString()!;

        var (readSuccess, readBody, _) = await PostAsync($"/api/v1/notifications/{notificationId}/read", new { }, ownerToken);
        readSuccess.Should().BeTrue();
        readBody.GetProperty("data").GetProperty("isRead").GetBoolean().Should().BeTrue();

        var (_, finalUnreadBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        finalUnreadBody.GetProperty("data").GetInt32().Should().Be(beforeUnread);
    }

    [Fact]
    public async Task Notification_MarkAllRead_ClearsUnreadCount()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("notif-mark-all");
        var projectId = await CreateProjectAsync(ownerToken, "NOTIFALL");
        var expenseId1 = await CreateExpenseAsync(ownerToken, projectId);
        var expenseId2 = await CreateExpenseAsync(ownerToken, projectId);
        await PostAsync($"/api/v1/construction/expenses/{expenseId1}/approve", new { }, ownerToken);
        await PostAsync($"/api/v1/construction/expenses/{expenseId2}/approve", new { }, ownerToken);

        var (_, beforeBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        beforeBody.GetProperty("data").GetInt32().Should().BeGreaterThanOrEqualTo(2);

        var (markSuccess, _, _) = await PostAsync("/api/v1/notifications/read-all", new { }, ownerToken);
        markSuccess.Should().BeTrue();

        var (_, afterBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        afterBody.GetProperty("data").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task Notification_TenantIsolation_NeverCrossesTenants()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("notif-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("notif-iso-b");
        var projectIdA = await CreateProjectAsync(tokenA, "NOTIFISOA");
        var expenseIdA = await CreateExpenseAsync(tokenA, projectIdA);
        await PostAsync($"/api/v1/construction/expenses/{expenseIdA}/approve", new { }, tokenA);

        var (_, listBodyB, _) = await GetAsync("/api/v1/notifications", tokenB);
        listBodyB.GetProperty("data").EnumerateArray().Any(n => n.GetProperty("entityId").GetString() == expenseIdA).Should().BeFalse();
    }

    [Fact]
    public async Task NotificationPreference_DisablingInApp_StopsFutureNotificationsOfThatCategory()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("notif-pref");
        var projectId = await CreateProjectAsync(ownerToken, "NOTIFPREF");

        var (updateSuccess, updateBody, _) = await PutAsync("/api/v1/notifications/preferences", new { category = 2, inAppEnabled = false, emailEnabled = false }, ownerToken); // ApprovalDecided
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("inAppEnabled").GetBoolean().Should().BeFalse();

        var expenseId = await CreateExpenseAsync(ownerToken, projectId);
        var (_, beforeBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        var before = beforeBody.GetProperty("data").GetInt32();

        await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken); // triggers ApprovalDecided to the requester (owner) — now disabled

        var (_, afterBody, _) = await GetAsync("/api/v1/notifications/unread-count", ownerToken);
        afterBody.GetProperty("data").GetInt32().Should().Be(before); // no new notification for the disabled category
    }

    // ===== Communication (dev-safe provider + failure/skip handling) =====

    [Fact]
    public async Task Communication_DevProvider_LogsEmailAsSent_WithNoRealSmtpConfigured()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("comm-dev-provider");
        var projectId = await CreateProjectAsync(ownerToken, "COMMDEV");
        var expenseId = await CreateExpenseAsync(ownerToken, projectId);

        // No SMTP is configured anywhere in this test process — if the dev-safe LoggingEmailSender
        // weren't wired in, this call would throw instead of completing normally.
        var (approveSuccess, _, _) = await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken);
        approveSuccess.Should().BeTrue();

        var (logSuccess, logBody, _) = await GetAsync($"/api/v1/communication-logs?entityType=Expense&entityId={expenseId}", ownerToken);
        logSuccess.Should().BeTrue();
        var logs = logBody.GetProperty("data").EnumerateArray().ToList();
        logs.Should().Contain(l => l.GetProperty("channel").GetInt32() == 2 && l.GetProperty("status").GetInt32() == 0); // Email, Sent
        logs.Should().Contain(l => l.GetProperty("channel").GetInt32() == 1 && l.GetProperty("status").GetInt32() == 0); // InApp, Sent
    }

    [Fact]
    public async Task Communication_SkippedChannel_IsLoggedAsSkippedNotFailed_WhenPreferenceDisablesIt()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("comm-skip");
        var projectId = await CreateProjectAsync(ownerToken, "COMMSKIP");

        await PutAsync("/api/v1/notifications/preferences", new { category = 2, inAppEnabled = true, emailEnabled = false }, ownerToken); // ApprovalDecided

        var expenseId = await CreateExpenseAsync(ownerToken, projectId);
        await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, ownerToken);

        var (_, logBody, _) = await GetAsync($"/api/v1/communication-logs?entityType=Expense&entityId={expenseId}", ownerToken);
        var logs = logBody.GetProperty("data").EnumerateArray().ToList();
        logs.Should().Contain(l => l.GetProperty("channel").GetInt32() == 2 && l.GetProperty("status").GetInt32() == 2); // Email, Skipped
    }

    [Fact]
    public async Task CommunicationLogs_AreTenantScoped()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("comm-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("comm-iso-b");
        var projectIdA = await CreateProjectAsync(tokenA, "COMMISOA");
        var expenseIdA = await CreateExpenseAsync(tokenA, projectIdA);
        await PostAsync($"/api/v1/construction/expenses/{expenseIdA}/approve", new { }, tokenA);

        var (_, logBodyB, _) = await GetAsync($"/api/v1/communication-logs?entityType=Expense&entityId={expenseIdA}", tokenB);
        logBodyB.GetProperty("data").GetArrayLength().Should().Be(0);
    }
}
