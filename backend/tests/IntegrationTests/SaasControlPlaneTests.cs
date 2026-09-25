using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Application.Communication;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Infrastructure.Jobs;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services.Communication;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class SaasControlPlaneTests : TestBase
{
    public SaasControlPlaneTests(CustomWebApplicationFactory factory) : base(factory) { }

    // ---- setup helpers ----

    private async Task<Guid> CreatePlanAsync(
        string superAdminToken, string codeSuffix, decimal price = 100m, int trialDays = 14,
        IEnumerable<object>? entitlements = null)
    {
        var (success, body, status) = await PostAsync("/api/v1/platform/subscription-plans", new
        {
            name = $"Plan {codeSuffix}", code = $"plan-{codeSuffix}", description = (string?)null, displayOrder = 0,
            trialDays, currency = "USD", price, setupPrice = (decimal?)null, billingCycle = 0, metadataJson = (string?)null,
            entitlements = entitlements ?? Array.Empty<object>()
        }, superAdminToken);
        success.Should().BeTrue($"plan creation should succeed: {status} {body}");
        return Guid.Parse(body.GetProperty("data").GetProperty("id").GetString()!);
    }

    private async Task<(bool Success, System.Text.Json.JsonElement Body, HttpStatusCode Status)> AssignPlanAsync(
        string superAdminToken, Guid tenantId, Guid planId, bool skipTrial = false) =>
        await PostAsync($"/api/v1/platform/organizations/{tenantId}/subscription", new { planId, skipTrial }, superAdminToken);

    private async Task<(bool Success, System.Text.Json.JsonElement Body, HttpStatusCode Status)> TransitionAsync(
        string superAdminToken, Guid subscriptionId, int toStatus) =>
        await PostAsync($"/api/v1/platform/subscriptions/{subscriptionId}/transition", new { toStatus, reason = (string?)null }, superAdminToken);

    private static object FeatureEntitlement(string code, bool enabled) => new { code, boolValue = enabled, numericValue = (long?)null };
    private static object LimitEntitlement(string code, long? limit) => new { code, boolValue = (bool?)null, numericValue = limit };

    // ---- plan + entitlement catalog ----

    [Fact]
    public async Task Plan_CanBeCreatedWithEntitlements_AndRetrieved()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var planId = await CreatePlanAsync(superAdmin, suffix, price: 49.99m, trialDays: 7, entitlements: new[]
        {
            FeatureEntitlement("external_portals", false),
            LimitEntitlement("max_projects", 5)
        });

        var (success, body, _) = await GetAsync($"/api/v1/platform/subscription-plans/{planId}", superAdmin);
        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("price").GetDecimal().Should().Be(49.99m);
        body.GetProperty("data").GetProperty("trialDays").GetInt32().Should().Be(7);
        body.GetProperty("data").GetProperty("currency").GetString().Should().Be("USD");

        var entitlements = body.GetProperty("data").GetProperty("entitlements").EnumerateArray().ToList();
        entitlements.Should().Contain(e => e.GetProperty("code").GetString() == "external_portals" && e.GetProperty("boolValue").GetBoolean() == false);
        entitlements.Should().Contain(e => e.GetProperty("code").GetString() == "max_projects" && e.GetProperty("numericValue").GetInt64() == 5);
    }

    // ---- subscription lifecycle ----

    [Fact]
    public async Task AssignPlan_StartsTrialSubscription_AndKeepsTenantStatusTrial()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationAsync("saas-trial");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], trialDays: 14);

        var (assignSuccess, assignBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId);
        assignSuccess.Should().BeTrue();
        assignBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be((int)SubscriptionStatus.Trialing);

        var (orgSuccess, orgBody, _) = await GetAsync($"/api/v1/platform/organizations/{tenantId}", superAdmin);
        orgSuccess.Should().BeTrue();
        orgBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // TenantStatus.Trial
    }

    [Fact]
    public async Task AssignPlan_SkipTrial_StartsActiveSubscription_AndSetsTenantStatusActive()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationAsync("saas-active");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);

        var (assignSuccess, assignBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true);
        assignSuccess.Should().BeTrue();
        assignBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be((int)SubscriptionStatus.Active);

        var (_, orgBody, _) = await GetAsync($"/api/v1/platform/organizations/{tenantId}", superAdmin);
        orgBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // TenantStatus.Active
    }

    [Fact]
    public async Task AssignPlan_ASecondTime_IsRejected()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationAsync("saas-double-assign");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);

        (await AssignPlanAsync(superAdmin, tenantId, planId)).Success.Should().BeTrue();
        var (secondSuccess, secondBody, secondStatus) = await AssignPlanAsync(superAdmin, tenantId, planId);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
        secondBody.GetProperty("code").GetString().Should().Be("already_subscribed");
    }

    [Fact]
    public async Task Subscription_InvalidTransition_IsRejected()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationAsync("saas-invalid-transition");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);
        var (_, assignBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId);
        var subscriptionId = Guid.Parse(assignBody.GetProperty("data").GetProperty("id").GetString()!);

        // Trialing -> PastDue is not a valid transition (see SubscriptionStatusRules).
        var (success, body, status) = await TransitionAsync(superAdmin, subscriptionId, (int)SubscriptionStatus.PastDue);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
        body.GetProperty("code").GetString().Should().Be("invalid_transition");
    }

    [Fact]
    public async Task Subscription_CancelledTransition_SetsTenantCancelled_AndBlocksFurtherApiAccess()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, tenantId, _) = await CreateOrganizationAsync("saas-cancel");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);
        var (_, assignBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true);
        var subscriptionId = Guid.Parse(assignBody.GetProperty("data").GetProperty("id").GetString()!);

        // The owner can use the API right after activation.
        (await GetAsync("/api/v1/users", ownerToken)).Success.Should().BeTrue();

        var (transitionSuccess, transitionBody, _) = await TransitionAsync(superAdmin, subscriptionId, (int)SubscriptionStatus.Cancelled);
        transitionSuccess.Should().BeTrue();
        transitionBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be((int)SubscriptionStatus.Cancelled);

        var (_, orgBody, _) = await GetAsync($"/api/v1/platform/organizations/{tenantId}", superAdmin);
        orgBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3); // TenantStatus.Cancelled

        // The pre-existing Milestone 10 TenantStatusMiddleware now blocks this tenant's already-issued
        // token — proving Subscription lifecycle correctly drives TenantStatus without a second,
        // contradictory enforcement path.
        var (blockedSuccess, _, blockedStatus) = await GetAsync("/api/v1/users", ownerToken);
        blockedSuccess.Should().BeFalse();
        blockedStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- feature entitlement enforcement ----

    [Fact]
    public async Task FeatureEntitlement_Disabled_BlocksPortalAccess_ButUnrestrictedTenantIsUnaffected()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, tenantId, _, slug) = await CreateOrganizationWithSlugAsync("saas-feature-gate");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], entitlements: new[]
        {
            FeatureEntitlement("external_portals", false)
        });
        (await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true)).Success.Should().BeTrue();

        var (_, customerBody, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = "Gated Customer", email = (string?)null, phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, ownerToken);
        var customerId = customerBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, inviteBody, _) = await PostAsync("/api/v1/portal-accounts/invite", new
        {
            actorType = "Customer", actorId = Guid.Parse(customerId), email = "gated-customer@portal.test"
        }, ownerToken);
        var portalUserId = Guid.Parse(inviteBody.GetProperty("data").GetProperty("id").GetString()!);
        await SetPortalPasswordAsync(portalUserId, "Portal@12345");

        var (loginSuccess, loginBody, _) = await PortalLoginAsync(slug, "gated-customer@portal.test", "Portal@12345");
        loginSuccess.Should().BeTrue();
        var portalToken = loginBody.GetProperty("data").GetProperty("accessToken").GetString()!;

        var (bookingsSuccess, bookingsBody, bookingsStatus) = await GetAsync("/api/v1/portal/customer/bookings", portalToken);
        bookingsSuccess.Should().BeFalse();
        bookingsStatus.Should().Be(HttpStatusCode.Forbidden);
        bookingsBody.GetProperty("code").GetString().Should().Be("feature_not_entitled");

        // A tenant with NO plan assigned is always unrestricted — confirms zero regression for every
        // pre-existing (pre-Milestone-14) tenant, none of which have a plan.
        var (unrestrictedOwnerToken, _, _, unrestrictedSlug) = await CreateOrganizationWithSlugAsync("saas-feature-unrestricted");
        var (_, freeCustomerBody, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = "Free Customer", email = (string?)null, phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, unrestrictedOwnerToken);
        var freeCustomerId = freeCustomerBody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, freeInviteBody, _) = await PostAsync("/api/v1/portal-accounts/invite", new
        {
            actorType = "Customer", actorId = Guid.Parse(freeCustomerId), email = "free-customer@portal.test"
        }, unrestrictedOwnerToken);
        var freePortalUserId = Guid.Parse(freeInviteBody.GetProperty("data").GetProperty("id").GetString()!);
        await SetPortalPasswordAsync(freePortalUserId, "Portal@12345");
        var (_, freeLoginBody, _) = await PortalLoginAsync(unrestrictedSlug, "free-customer@portal.test", "Portal@12345");
        var freePortalToken = freeLoginBody.GetProperty("data").GetProperty("accessToken").GetString()!;

        (await GetAsync("/api/v1/portal/customer/bookings", freePortalToken)).Success.Should().BeTrue();
    }

    // ---- limit entitlement enforcement ----

    [Fact]
    public async Task LimitEntitlement_MaxProjects_EnforcedAtCreation()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, tenantId, _) = await CreateOrganizationAsync("saas-max-projects");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], entitlements: new[] { LimitEntitlement("max_projects", 1) });
        (await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true)).Success.Should().BeTrue();

        var (firstSuccess, _, _) = await PostAsync("/api/v1/projects", new
        {
            name = "Project One", code = "LIM-1", type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            startDate = (DateOnly?)null, endDate = (DateOnly?)null, latitude = (decimal?)null, longitude = (decimal?)null, geoJson = (string?)null
        }, ownerToken);
        firstSuccess.Should().BeTrue();

        var (secondSuccess, secondBody, secondStatus) = await PostAsync("/api/v1/projects", new
        {
            name = "Project Two", code = "LIM-2", type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            startDate = (DateOnly?)null, endDate = (DateOnly?)null, latitude = (decimal?)null, longitude = (decimal?)null, geoJson = (string?)null
        }, ownerToken);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
        secondBody.GetProperty("code").GetString().Should().Be("limit_exceeded");
    }

    [Fact]
    public async Task LimitEntitlement_MaxUsers_EnforcedAtCreation()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, tenantId, _) = await CreateOrganizationAsync("saas-max-users");
        // The org owner itself already counts as 1 user, so a limit of 1 blocks the very first added user.
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], entitlements: new[] { LimitEntitlement("max_users", 1) });
        (await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true)).Success.Should().BeTrue();

        var (success, body, status) = await PostAsync("/api/v1/users", new
        {
            email = $"extra-{Guid.NewGuid():N}@saas-max-users.test", fullName = "Extra User", password = "Extra@12345",
            phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" }
        }, ownerToken);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
        body.GetProperty("code").GetString().Should().Be("limit_exceeded");
    }

    // ---- platform admin isolation ----

    [Fact]
    public async Task PlatformAdminEndpoints_RejectOrdinaryTenantTokens()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("saas-platform-iso");

        (await GetAsync("/api/v1/platform/subscriptions", ownerToken)).Status.Should().Be(HttpStatusCode.Forbidden);
        (await GetAsync("/api/v1/platform/invoices", ownerToken)).Status.Should().Be(HttpStatusCode.Forbidden);

        var fakeTenantId = Guid.NewGuid();
        (await PostAsync($"/api/v1/platform/organizations/{fakeTenantId}/subscription", new { planId = Guid.NewGuid(), skipTrial = true }, ownerToken))
            .Status.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- tenant isolation across subscription/usage/invoices ----

    [Fact]
    public async Task TenantFacingEndpoints_NeverExposeAnotherTenantsSubscriptionUsageOrInvoices()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerTokenA, tenantIdA, _) = await CreateOrganizationAsync("saas-tenant-iso-a");
        var (ownerTokenB, tenantIdB, _) = await CreateOrganizationAsync("saas-tenant-iso-b");

        var planA = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);
        var planB = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8]);
        var (_, subABody, _) = await AssignPlanAsync(superAdmin, tenantIdA, planA, skipTrial: true);
        var (_, subBBody, _) = await AssignPlanAsync(superAdmin, tenantIdB, planB, skipTrial: true);
        var subscriptionAId = Guid.Parse(subABody.GetProperty("data").GetProperty("id").GetString()!);
        var subscriptionBId = Guid.Parse(subBBody.GetProperty("data").GetProperty("id").GetString()!);

        var (_, ownSubA, _) = await GetAsync("/api/v1/subscription", ownerTokenA);
        ownSubA.GetProperty("data").GetProperty("id").GetString().Should().Be(subscriptionAId.ToString());
        ownSubA.GetProperty("data").GetProperty("id").GetString().Should().NotBe(subscriptionBId.ToString());

        var invoiceA = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId = subscriptionAId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14
        }, superAdmin);
        invoiceA.Success.Should().BeTrue();
        var invoiceAId = invoiceA.Body.GetProperty("data").GetProperty("id").GetString();

        var (_, invoicesForA, _) = await GetAsync("/api/v1/billing/invoices", ownerTokenA);
        invoicesForA.GetProperty("data").EnumerateArray().Any(i => i.GetProperty("id").GetString() == invoiceAId).Should().BeTrue();

        var (_, invoicesForB, _) = await GetAsync("/api/v1/billing/invoices", ownerTokenB);
        invoicesForB.GetProperty("data").EnumerateArray().Any(i => i.GetProperty("id").GetString() == invoiceAId).Should().BeFalse();

        // B cannot fetch A's invoice by id either.
        var (getInvoiceSuccess, _, getInvoiceStatus) = await GetAsync($"/api/v1/billing/invoices/{invoiceAId}", ownerTokenB);
        getInvoiceSuccess.Should().BeFalse();
        getInvoiceStatus.Should().Be(HttpStatusCode.NotFound);

        // B has no subscription for A's id — GetForTenantAsync is always scoped to the ambient tenant.
        var (_, ownSubB, _) = await GetAsync("/api/v1/subscription", ownerTokenB);
        ownSubB.GetProperty("data").GetProperty("id").GetString().Should().Be(subscriptionBId.ToString());
    }

    // ---- invoice + payment idempotency ----

    [Fact]
    public async Task Payment_RecordPayment_IsIdempotent_AndMarksInvoicePaid()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (ownerToken, tenantId, _) = await CreateOrganizationAsync("saas-payment-idem");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], price: 200m);
        var (_, subBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId, skipTrial: true);
        var subscriptionId = Guid.Parse(subBody.GetProperty("data").GetProperty("id").GetString()!);

        var (_, invoiceBody, _) = await PostAsync("/api/v1/platform/invoices/generate", new
        {
            subscriptionId, taxAmount = 0m, lineItems = (object?)null, dueInDays = 14
        }, superAdmin);
        var invoiceId = invoiceBody.GetProperty("data").GetProperty("id").GetString()!;
        invoiceBody.GetProperty("data").GetProperty("total").GetDecimal().Should().Be(200m);

        var idempotencyKey = Guid.NewGuid().ToString();
        var (firstSuccess, firstBody, _) = await PostAsync($"/api/v1/platform/invoices/{invoiceId}/payments", new
        {
            amount = 200m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow), providerTransactionId = (string?)null, idempotencyKey
        }, superAdmin);
        firstSuccess.Should().BeTrue();
        var firstPaymentId = firstBody.GetProperty("data").GetProperty("id").GetString();

        var (retrySuccess, retryBody, _) = await PostAsync($"/api/v1/platform/invoices/{invoiceId}/payments", new
        {
            amount = 200m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow), providerTransactionId = (string?)null, idempotencyKey
        }, superAdmin);
        retrySuccess.Should().BeTrue();
        retryBody.GetProperty("data").GetProperty("id").GetString().Should().Be(firstPaymentId);

        var (_, paymentsBody, _) = await GetAsync($"/api/v1/platform/invoices/{invoiceId}/payments", superAdmin);
        paymentsBody.GetProperty("data").GetArrayLength().Should().Be(1);

        var (_, invoiceAfter, _) = await GetAsync($"/api/v1/platform/invoices/{invoiceId}", superAdmin);
        invoiceAfter.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // InvoiceStatus.Paid
    }

    // ---- email provider ----

    [Fact]
    public void EmailSender_DefaultsToLoggingSender_WhenSmtpNotConfigured()
    {
        using var scope = Factory.Services.CreateScope();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        emailSender.Should().BeOfType<LoggingEmailSender>("no test configuration ever sets Smtp:Enabled=true");
    }

    // ---- background job ----

    [Fact]
    public async Task SubscriptionLifecycleJob_ExpiresOverdueTrials_AndIsIdempotentOnRerun()
    {
        var superAdmin = await LoginSuperAdminAsync();
        var (_, tenantId, _) = await CreateOrganizationAsync("saas-job-expiry");
        var planId = await CreatePlanAsync(superAdmin, Guid.NewGuid().ToString("N")[..8], trialDays: 14);
        var (_, subBody, _) = await AssignPlanAsync(superAdmin, tenantId, planId);
        var subscriptionId = Guid.Parse(subBody.GetProperty("data").GetProperty("id").GetString()!);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var subscription = await db.Subscriptions.IgnoreQueryFilters().FirstAsync(s => s.Id == subscriptionId);
            subscription.TrialEndsAt = DateTimeOffset.UtcNow.AddDays(-1);
            await db.SaveChangesAsync();
        }

        using (var scope = Factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<SubscriptionLifecycleJob>();
            await job.RunAsync();
        }

        var (_, orgBody, _) = await GetAsync($"/api/v1/platform/organizations/{tenantId}", superAdmin);
        orgBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // TenantStatus.Suspended

        var (_, subAfter, _) = await GetAsync("/api/v1/platform/subscriptions", superAdmin);
        var expired = subAfter.GetProperty("data").EnumerateArray().First(s => s.GetProperty("id").GetString() == subscriptionId.ToString());
        expired.GetProperty("status").GetInt32().Should().Be((int)SubscriptionStatus.Expired);

        // Re-running the job must be a safe no-op: the subscription is no longer Trialing, so
        // SubscriptionStatusRules.CanTransition skips it — no exception, no duplicate audit entry.
        using (var scope = Factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<SubscriptionLifecycleJob>();
            var act = async () => await job.RunAsync();
            await act.Should().NotThrowAsync();
        }

        var (_, auditBody, _) = await GetAsync($"/api/v1/platform/audit-logs?module=Subscription&entityType=Subscription", superAdmin);
        auditBody.GetProperty("data").EnumerateArray()
            .Count(e => e.GetProperty("entityId").GetString() == subscriptionId.ToString() && e.GetProperty("action").GetString() == "TrialExpired")
            .Should().Be(1);
    }
}
