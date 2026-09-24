using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class PortalTests : TestBase
{
    public PortalTests(CustomWebApplicationFactory factory) : base(factory) { }

    private const string DefaultPassword = "Portal@12345";

    // ---- generic setup helpers (mirrors the patterns used in the other *Tests.cs files) ----

    private async Task<string> CreatePropertyAsync(string token, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/properties", new
        {
            code, name = $"Property {code}", type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            ownerName = (string?)null, ownerContact = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateUnitAsync(string token, string propertyId, string unitNumber, decimal? marketRentRate = null)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/units", new
        {
            propertyId = Guid.Parse(propertyId), buildingBlock = (string?)null, unitNumber, type = 0, floor = (string?)null,
            areaSize = (decimal?)null, areaUnit = (string?)null, bedrooms = (int?)null, marketRentRate, metadataJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateRentalTenantAsync(string token, string fullName)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/tenants", new
        {
            customerId = (Guid?)null, fullName, email = $"{fullName.Replace(" ", "").ToLowerInvariant()}@tenant.test",
            phone = (string?)null, address = (string?)null, isCompany = false, identificationNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateLeaseAsync(string token, string propertyId, string unitId, string tenantId, DateOnly start, DateOnly end, decimal rent = 1000m, decimal deposit = 500m)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/leases", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(unitId), rentalTenantId = Guid.Parse(tenantId),
            startDate = start, endDate = end, rentAmount = rent, securityDeposit = deposit,
            paymentFrequency = 0, gracePeriodDays = 5, terms = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task ActivateLeaseAsync(string token, string leaseId)
    {
        (await PostAsync($"/api/v1/property/leases/{leaseId}/submit", new { }, token)).Success.Should().BeTrue();
        (await PostAsync($"/api/v1/property/leases/{leaseId}/approve", new { }, token)).Success.Should().BeTrue();
    }

    private async Task<string> CreateCustomerAsync(string token, string name)
    {
        var (_, body, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = name, email = (string?)null, phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

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

    private async Task<string> CreateInventoryUnitAsync(string token, string projectId, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId), nodeId = (Guid?)null, code, type = 0, areaSize = (decimal?)null,
            areaUnit = (int?)null, latitude = (decimal?)null, longitude = (decimal?)null, geoJson = (string?)null, metadataJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateBookingAsync(string token, string customerId, string projectId, string unitId, string agentUserId, decimal totalPrice = 1_000_000m)
    {
        var (_, body, _) = await PostAsync("/api/v1/sales/bookings", new
        {
            customerId = Guid.Parse(customerId), projectId = Guid.Parse(projectId), inventoryUnitId = Guid.Parse(unitId),
            salesAgentUserId = Guid.Parse(agentUserId), bookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            totalPrice, discount = 0m, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task CreatePaymentPlanAsync(string token, string bookingId, int numberOfInstallments = 2)
    {
        (await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Standard", bookingAmount = 0m, downPayment = 0m, planType = 1, frequency = 0,
            numberOfInstallments, gracePeriodDays = 0, customSchedule = (object?)null
        }, token)).Success.Should().BeTrue();
    }

    private async Task<string> CreatePropertyOwnerAsync(string token, string fullName)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/owners", new
        {
            fullName, email = $"{fullName.Replace(" ", "").ToLowerInvariant()}@owner.test", phone = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task LinkPropertyToOwnerAsync(string token, string ownerId, string propertyId)
    {
        (await PostAsync($"/api/v1/property/owners/{ownerId}/properties/{propertyId}", new { }, token)).Success.Should().BeTrue();
    }

    private async Task<string> CreateVendorAsync(string token, string name)
    {
        var (_, body, _) = await PostAsync("/api/v1/procurement/vendors", new
        {
            name, contactPerson = (string?)null, email = (string?)null, phone = (string?)null, address = (string?)null,
            taxRegistrationNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreatePurchaseOrderAsync(string token, string vendorId, string projectId, decimal qty = 10m, decimal unitPrice = 5m)
    {
        var (_, body, _) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId), projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, purchaseRequestId = (Guid?)null,
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow), expectedDeliveryDate = (DateOnly?)null, discount = 0m, taxAmount = 0m, notes = (string?)null,
            lines = new[] { new { materialId = (Guid?)null, itemDescription = "Cement", unitOfMeasure = "bag", quantity = qty, unitPrice } }
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateFacilityAsync(string token, string propertyId, string code, int type = 1)
    {
        var (_, body, _) = await PostAsync("/api/v1/facilities", new
        {
            code, propertyId = Guid.Parse(propertyId), type, name = $"Facility {code}", description = (string?)null,
            addressLine = (string?)null, city = (string?)null, managerUserId = (Guid?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateSpaceAsync(string token, string facilityId, string code, int type = 2, int? capacity = 20, decimal? rate = 5m)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/spaces", new
        {
            facilityId = Guid.Parse(facilityId), propertyUnitId = (Guid?)null, buildingBlock = (string?)null,
            code, type, areaSize = (decimal?)null, capacity, rate, metadataJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateCoworkingMemberAsync(string token, string fullName)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/coworking/members", new
        {
            customerId = (Guid?)null, fullName, email = (string?)null, phone = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateCoworkingPlanAsync(string token, string facilityId, string name, int durationDays, decimal price)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/coworking/plans", new
        {
            facilityId = Guid.Parse(facilityId), name, durationDays, price, includedHoursCredits = (decimal?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateMembershipAsync(string token, string memberId, string planId, DateOnly start)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/coworking/memberships", new
        {
            memberId = Guid.Parse(memberId), planId = Guid.Parse(planId), startDate = start
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateDeskAsync(string token, string spaceId, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/coworking/desks", new { spaceId = Guid.Parse(spaceId), code, type = 0 }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateCoworkingBookingAsync(string token, string memberId, string deskId, DateTimeOffset start, DateTimeOffset end)
    {
        var (_, body, _) = await PostAsync("/api/v1/facility/coworking/bookings", new
        {
            memberId = Guid.Parse(memberId), resourceType = 0, resourceId = Guid.Parse(deskId), startAt = start, endAt = end, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<(string Token, Guid UserId)> CreateInternalUserAsync(string ownerToken, string email, string role)
    {
        await PostAsync("/api/v1/users", new { email, fullName = "Agent User", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { role } }, ownerToken);
        var (_, listBody, _) = await GetAsync("/api/v1/users", ownerToken);
        var id = Guid.Parse(listBody.GetProperty("data").EnumerateArray().First(u => u.GetProperty("email").GetString() == email).GetProperty("id").GetString()!);
        var token = await LoginAsync(email, "Agent@12345");
        return (token, id);
    }

    // ---- portal-specific setup helpers ----

    private async Task<(Guid PortalUserId, string PortalToken)> InviteAndLoginPortalUserAsync(
        string ownerToken, string slug, string actorType, string actorId, string email, string password = DefaultPassword)
    {
        var (inviteSuccess, inviteBody, inviteStatus) = await PostAsync("/api/v1/portal-accounts/invite", new
        {
            actorType, actorId = Guid.Parse(actorId), email
        }, ownerToken);
        inviteSuccess.Should().BeTrue($"invite should succeed: {inviteStatus} {inviteBody}");
        var portalUserId = Guid.Parse(inviteBody.GetProperty("data").GetProperty("id").GetString()!);

        await SetPortalPasswordAsync(portalUserId, password);

        var (loginSuccess, loginBody, loginStatus) = await PortalLoginAsync(slug, email, password);
        loginSuccess.Should().BeTrue($"portal login should succeed: {loginStatus} {loginBody}");
        var token = loginBody.GetProperty("data").GetProperty("accessToken").GetString()!;
        return (portalUserId, token);
    }

    // ---- portal login ----

    [Fact]
    public async Task PortalLogin_Succeeds_AndRejectsWrongPassword_AndWrongTenantSlug()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-login");
        var customerId = await CreateCustomerAsync(ownerToken, "Portal Login Customer");
        var (_, portalToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "login-customer@portal.test");

        portalToken.Should().NotBeNullOrEmpty();

        var (wrongPasswordSuccess, _, wrongPasswordStatus) = await PortalLoginAsync(slug, "login-customer@portal.test", "WrongPass@123");
        wrongPasswordSuccess.Should().BeFalse();
        wrongPasswordStatus.Should().Be(HttpStatusCode.Unauthorized);

        var (wrongSlugSuccess, _, wrongSlugStatus) = await PortalLoginAsync("no-such-tenant-slug", "login-customer@portal.test", DefaultPassword);
        wrongSlugSuccess.Should().BeFalse();
        wrongSlugStatus.Should().Be(HttpStatusCode.Unauthorized);

        // The "me" endpoint reflects the authenticated portal identity.
        var (meSuccess, meBody, _) = await GetAsync("/api/v1/portal/auth/me", portalToken);
        meSuccess.Should().BeTrue();
        meBody.GetProperty("data").GetProperty("actorType").GetString().Should().Be("Customer");
    }

    [Fact]
    public async Task SameEmail_CanHavePortalAccountsAtTwoDifferentTenants()
    {
        var (ownerTokenA, _, _, slugA) = await CreateOrganizationWithSlugAsync("portal-multi-a");
        var (ownerTokenB, _, _, slugB) = await CreateOrganizationWithSlugAsync("portal-multi-b");
        var customerIdA = await CreateCustomerAsync(ownerTokenA, "Shared Email Customer A");
        var customerIdB = await CreateCustomerAsync(ownerTokenB, "Shared Email Customer B");

        const string sharedEmail = "shared-portal-user@example.test";
        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerTokenA, slugA, "Customer", customerIdA, sharedEmail);
        var (_, tokenB) = await InviteAndLoginPortalUserAsync(ownerTokenB, slugB, "Customer", customerIdB, sharedEmail);

        tokenA.Should().NotBeNullOrEmpty();
        tokenB.Should().NotBeNullOrEmpty();

        var (meA, meBodyA, _) = await GetAsync("/api/v1/portal/auth/me", tokenA);
        var (meB, meBodyB, _) = await GetAsync("/api/v1/portal/auth/me", tokenB);
        meA.Should().BeTrue();
        meB.Should().BeTrue();
        meBodyA.GetProperty("data").GetProperty("tenantId").GetString().Should().NotBe(meBodyB.GetProperty("data").GetProperty("tenantId").GetString());
    }

    // ---- cross-cutting isolation between the internal app and the portal ----

    [Fact]
    public async Task PortalUser_CannotAccessInternalEndpoints()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-internal-iso");
        var customerId = await CreateCustomerAsync(ownerToken, "Isolation Customer");
        var (_, portalToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "iso-customer@portal.test");

        // Bare [Authorize] internal endpoint (no [RequirePermission]) — protected by the default policy's NotPortalRequirement.
        var (notifSuccess, _, notifStatus) = await GetAsync("/api/v1/notifications", portalToken);
        notifSuccess.Should().BeFalse();
        notifStatus.Should().Be(HttpStatusCode.Forbidden);

        // [RequirePermission]-gated internal endpoint — protected by PermissionAuthorizationHandler's explicit rejection.
        var (usersSuccess, _, usersStatus) = await GetAsync("/api/v1/users", portalToken);
        usersSuccess.Should().BeFalse();
        usersStatus.Should().Be(HttpStatusCode.Forbidden);

        var (docsSuccess, _, docsStatus) = await GetAsync("/api/v1/documents?entityType=Customer&entityId=" + customerId, portalToken);
        docsSuccess.Should().BeFalse();
        docsStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task InternalUser_CannotAccessPortalEndpoints_AndAnonymous_IsRejected()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("internal-portal-iso");

        var (internalSuccess, _, internalStatus) = await GetAsync("/api/v1/portal/customer/bookings", ownerToken);
        internalSuccess.Should().BeFalse();
        internalStatus.Should().Be(HttpStatusCode.Forbidden);

        var (anonSuccess, _, anonStatus) = await GetAsync("/api/v1/portal/customer/bookings");
        anonSuccess.Should().BeFalse();
        anonStatus.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PortalUser_OfOneActorType_CannotAccessAnotherActorTypesEndpoints()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-actor-iso");
        var customerId = await CreateCustomerAsync(ownerToken, "Actor Iso Customer");
        var (_, customerToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "actor-iso-customer@portal.test");

        var (wrongAreaSuccess, _, wrongAreaStatus) = await GetAsync("/api/v1/portal/tenant/leases", customerToken);
        wrongAreaSuccess.Should().BeFalse();
        wrongAreaStatus.Should().Be(HttpStatusCode.Forbidden);

        var (wrongAreaSuccess2, _, wrongAreaStatus2) = await GetAsync("/api/v1/portal/vendor/purchase-orders", customerToken);
        wrongAreaSuccess2.Should().BeFalse();
        wrongAreaStatus2.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- Customer Portal ----

    [Fact]
    public async Task CustomerPortal_CanAccessOwnBookingPaymentPlanAndDocuments_ButNotAnotherCustomers()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-customer");
        var projectId = await CreateProjectAsync(ownerToken, "PCUST");
        var unitAId = await CreateInventoryUnitAsync(ownerToken, projectId, "UNIT-A");
        var unitBId = await CreateInventoryUnitAsync(ownerToken, projectId, "UNIT-B");
        var (_, agentListBody, _) = await GetAsync("/api/v1/users", ownerToken);
        var agentUserId = agentListBody.GetProperty("data")[0].GetProperty("id").GetString()!;

        var customerAId = await CreateCustomerAsync(ownerToken, "Customer A");
        var customerBId = await CreateCustomerAsync(ownerToken, "Customer B");
        var bookingAId = await CreateBookingAsync(ownerToken, customerAId, projectId, unitAId, agentUserId, 500_000m);
        var bookingBId = await CreateBookingAsync(ownerToken, customerBId, projectId, unitBId, agentUserId, 600_000m);
        await CreatePaymentPlanAsync(ownerToken, bookingAId);

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerAId, "customer-a@portal.test");
        var (_, tokenB) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerBId, "customer-b@portal.test");

        var (listSuccessA, listBodyA, _) = await GetAsync("/api/v1/portal/customer/bookings", tokenA);
        listSuccessA.Should().BeTrue();
        var idsA = listBodyA.GetProperty("data").EnumerateArray().Select(b => b.GetProperty("id").GetString()).ToList();
        idsA.Should().Contain(bookingAId);
        idsA.Should().NotContain(bookingBId);

        var (getOwnSuccess, _, _) = await GetAsync($"/api/v1/portal/customer/bookings/{bookingAId}", tokenA);
        getOwnSuccess.Should().BeTrue();

        // Customer A cannot access Customer B's booking.
        var (getOtherSuccess, _, getOtherStatus) = await GetAsync($"/api/v1/portal/customer/bookings/{bookingBId}", tokenA);
        getOtherSuccess.Should().BeFalse();
        getOtherStatus.Should().Be(HttpStatusCode.NotFound);

        var (planSuccess, _, _) = await GetAsync($"/api/v1/portal/customer/bookings/{bookingAId}/payment-plan", tokenA);
        planSuccess.Should().BeTrue();

        var (otherPlanSuccess, _, otherPlanStatus) = await GetAsync($"/api/v1/portal/customer/bookings/{bookingBId}/payment-plan", tokenA);
        otherPlanSuccess.Should().BeFalse();
        otherPlanStatus.Should().Be(HttpStatusCode.NotFound);

        var (paymentsSuccess, _, _) = await GetAsync($"/api/v1/portal/customer/bookings/{bookingAId}/payments", tokenA);
        paymentsSuccess.Should().BeTrue();

        var (allPaymentsSuccess, _, _) = await GetAsync("/api/v1/portal/customer/payments", tokenA);
        allPaymentsSuccess.Should().BeTrue();

        // B still sees exactly their own booking.
        var (listSuccessB, listBodyB, _) = await GetAsync("/api/v1/portal/customer/bookings", tokenB);
        listSuccessB.Should().BeTrue();
        var idsB = listBodyB.GetProperty("data").EnumerateArray().Select(b => b.GetProperty("id").GetString()).ToList();
        idsB.Should().Contain(bookingBId);
        idsB.Should().NotContain(bookingAId);
    }

    [Fact]
    public async Task CustomerPortal_DocumentDownload_EnforcesOwnership_AcrossCustomersAndTenants()
    {
        var (ownerTokenA, _, _, slugA) = await CreateOrganizationWithSlugAsync("portal-cust-doc-a");
        var (ownerTokenB, _, _, slugB) = await CreateOrganizationWithSlugAsync("portal-cust-doc-b");

        var customerAId = await CreateCustomerAsync(ownerTokenA, "Doc Customer A");
        var customerA2Id = await CreateCustomerAsync(ownerTokenA, "Doc Customer A2");
        var customerBId = await CreateCustomerAsync(ownerTokenB, "Doc Customer B");

        var (_, uploadBody, uploadStatus) = await PostFormAsync(
            "/api/v1/documents",
            new Dictionary<string, string> { ["EntityType"] = "Customer", ["EntityId"] = customerAId, ["Category"] = "0", ["Title"] = "ID", ["Description"] = "" },
            (System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\nfake\n"), "id.pdf", "application/pdf"), ownerTokenA);
        uploadStatus.Should().Be(HttpStatusCode.Created);
        var documentId = uploadBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerTokenA, slugA, "Customer", customerAId, "doc-customer-a@portal.test");
        var (_, tokenA2) = await InviteAndLoginPortalUserAsync(ownerTokenA, slugA, "Customer", customerA2Id, "doc-customer-a2@portal.test");

        var (ownDownloadSuccess, ownBytes, _, _) = await GetBytesAsync($"/api/v1/portal/customer/documents/{documentId}/download", tokenA);
        ownDownloadSuccess.Should().BeTrue();
        ownBytes.Length.Should().BeGreaterThan(0);

        // Another customer in the SAME tenant cannot download it.
        var (otherCustomerSuccess, _, otherCustomerStatus, _) = await GetBytesAsync($"/api/v1/portal/customer/documents/{documentId}/download", tokenA2);
        otherCustomerSuccess.Should().BeFalse();
        otherCustomerStatus.Should().Be(HttpStatusCode.NotFound);

        // A customer at a DIFFERENT tenant cannot even resolve the document row (EF tenant filter).
        var (_, crossTenantToken) = await InviteAndLoginPortalUserAsync(ownerTokenB, slugB, "Customer", customerBId, "doc-customer-b@portal.test");
        var (crossTenantSuccess, _, crossTenantStatus, _) = await GetBytesAsync($"/api/v1/portal/customer/documents/{documentId}/download", crossTenantToken);
        crossTenantSuccess.Should().BeFalse();
        crossTenantStatus.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Tenant Portal ----

    [Fact]
    public async Task TenantPortal_CanAccessOwnLeaseAndCreateMaintenanceRequest_ButNotAnotherTenants()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-tenant");
        var propertyId = await CreatePropertyAsync(ownerToken, "PT-1");
        var unitAId = await CreateUnitAsync(ownerToken, propertyId, "U-A", 1000m);
        var unitBId = await CreateUnitAsync(ownerToken, propertyId, "U-B", 1200m);
        var tenantAId = await CreateRentalTenantAsync(ownerToken, "Rental Tenant A");
        var tenantBId = await CreateRentalTenantAsync(ownerToken, "Rental Tenant B");

        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(3).AddDays(-1);
        var leaseAId = await CreateLeaseAsync(ownerToken, propertyId, unitAId, tenantAId, start, end, rent: 1000m, deposit: 500m);
        await ActivateLeaseAsync(ownerToken, leaseAId);
        var leaseBId = await CreateLeaseAsync(ownerToken, propertyId, unitBId, tenantBId, start, end, rent: 1200m, deposit: 600m);
        await ActivateLeaseAsync(ownerToken, leaseBId);

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "RentalTenant", tenantAId, "rental-tenant-a@portal.test");
        var (_, tokenB) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "RentalTenant", tenantBId, "rental-tenant-b@portal.test");

        var (listSuccessA, listBodyA, _) = await GetAsync("/api/v1/portal/tenant/leases", tokenA);
        listSuccessA.Should().BeTrue();
        var leaseIdsA = listBodyA.GetProperty("data").EnumerateArray().Select(l => l.GetProperty("id").GetString()).ToList();
        leaseIdsA.Should().Contain(leaseAId);
        leaseIdsA.Should().NotContain(leaseBId);

        var (getOwnSuccess, _, _) = await GetAsync($"/api/v1/portal/tenant/leases/{leaseAId}", tokenA);
        getOwnSuccess.Should().BeTrue();

        // Tenant A cannot access Tenant B's lease.
        var (getOtherSuccess, _, getOtherStatus) = await GetAsync($"/api/v1/portal/tenant/leases/{leaseBId}", tokenA);
        getOtherSuccess.Should().BeFalse();
        getOtherStatus.Should().Be(HttpStatusCode.NotFound);

        var (scheduleSuccess, scheduleBody, _) = await GetAsync($"/api/v1/portal/tenant/leases/{leaseAId}/rent-schedule", tokenA);
        scheduleSuccess.Should().BeTrue();
        scheduleBody.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);

        var (otherScheduleSuccess, _, otherScheduleStatus) = await GetAsync($"/api/v1/portal/tenant/leases/{leaseBId}/rent-schedule", tokenA);
        otherScheduleSuccess.Should().BeFalse();
        otherScheduleStatus.Should().Be(HttpStatusCode.NotFound);

        var (depositSuccess, _, _) = await GetAsync($"/api/v1/portal/tenant/leases/{leaseAId}/security-deposit", tokenA);
        depositSuccess.Should().BeTrue();

        // Tenant A can raise a maintenance request against their own lease.
        var (createMaintSuccess, createMaintBody, _) = await PostAsync("/api/v1/portal/tenant/maintenance-requests", new
        {
            leaseId = Guid.Parse(leaseAId), category = 0, priority = 1, description = "Leaking tap"
        }, tokenA);
        createMaintSuccess.Should().BeTrue();
        createMaintBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Open

        // Tenant A cannot raise a maintenance request against Tenant B's lease (the create endpoint
        // surfaces every service failure — including this ownership check — as 400, not 404).
        var (createMaintOtherSuccess, createMaintOtherBody, createMaintOtherStatus) = await PostAsync("/api/v1/portal/tenant/maintenance-requests", new
        {
            leaseId = Guid.Parse(leaseBId), category = 0, priority = 1, description = "Should not work"
        }, tokenA);
        createMaintOtherSuccess.Should().BeFalse();
        createMaintOtherStatus.Should().Be(HttpStatusCode.BadRequest);
        createMaintOtherBody.GetProperty("code").GetString().Should().Be("not_found");

        var (maintListSuccess, maintListBody, _) = await GetAsync("/api/v1/portal/tenant/maintenance-requests", tokenA);
        maintListSuccess.Should().BeTrue();
        maintListBody.GetProperty("data").GetArrayLength().Should().Be(1);
    }

    // ---- Owner Portal ----

    [Fact]
    public async Task OwnerPortal_CanAccessOwnProperties_ButNotAnotherOwners()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-owner");
        var propertyAId = await CreatePropertyAsync(ownerToken, "PO-A");
        var propertyBId = await CreatePropertyAsync(ownerToken, "PO-B");
        await CreateUnitAsync(ownerToken, propertyAId, "U-1", 1000m);
        await CreateUnitAsync(ownerToken, propertyBId, "U-1", 1000m);

        var propertyOwnerAId = await CreatePropertyOwnerAsync(ownerToken, "Owner Alpha");
        var propertyOwnerBId = await CreatePropertyOwnerAsync(ownerToken, "Owner Beta");
        await LinkPropertyToOwnerAsync(ownerToken, propertyOwnerAId, propertyAId);
        await LinkPropertyToOwnerAsync(ownerToken, propertyOwnerBId, propertyBId);

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "PropertyOwner", propertyOwnerAId, "property-owner-a@portal.test");
        var (_, tokenB) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "PropertyOwner", propertyOwnerBId, "property-owner-b@portal.test");

        var (listSuccessA, listBodyA, _) = await GetAsync("/api/v1/portal/owner/properties", tokenA);
        listSuccessA.Should().BeTrue();
        var propertyIdsA = listBodyA.GetProperty("data").EnumerateArray().Select(p => p.GetProperty("id").GetString()).ToList();
        propertyIdsA.Should().Contain(propertyAId);
        propertyIdsA.Should().NotContain(propertyBId);

        var (getOwnSuccess, _, _) = await GetAsync($"/api/v1/portal/owner/properties/{propertyAId}", tokenA);
        getOwnSuccess.Should().BeTrue();

        // Owner A cannot access Owner B's property.
        var (getOtherSuccess, _, getOtherStatus) = await GetAsync($"/api/v1/portal/owner/properties/{propertyBId}", tokenA);
        getOtherSuccess.Should().BeFalse();
        getOtherStatus.Should().Be(HttpStatusCode.NotFound);

        var (rentCollectedSuccess, rentCollectedBody, _) = await GetAsync("/api/v1/portal/owner/rent-collected", tokenA);
        rentCollectedSuccess.Should().BeTrue();
        rentCollectedBody.GetProperty("data").EnumerateArray().Any(r => r.GetProperty("propertyId").GetString() == propertyBId).Should().BeFalse();

        var (overdueSuccess, overdueBody, _) = await GetAsync("/api/v1/portal/owner/overdue-rent", tokenA);
        overdueSuccess.Should().BeTrue();
        overdueBody.GetProperty("data").EnumerateArray().Any(r => r.GetProperty("propertyId").GetString() == propertyBId).Should().BeFalse();

        var (revenueSuccess, revenueBody, _) = await GetAsync("/api/v1/portal/owner/revenue", tokenA);
        revenueSuccess.Should().BeTrue();
        revenueBody.GetProperty("data").EnumerateArray().Any(r => r.GetProperty("propertyId").GetString() == propertyBId).Should().BeFalse();
    }

    // ---- Vendor Portal ----

    [Fact]
    public async Task VendorPortal_CanAccessOwnPurchaseOrders_ButNotAnotherVendors()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-vendor");
        var projectId = await CreateProjectAsync(ownerToken, "PV1");
        var vendorAId = await CreateVendorAsync(ownerToken, "Vendor A");
        var vendorBId = await CreateVendorAsync(ownerToken, "Vendor B");
        var poAId = await CreatePurchaseOrderAsync(ownerToken, vendorAId, projectId);
        var poBId = await CreatePurchaseOrderAsync(ownerToken, vendorBId, projectId);

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Vendor", vendorAId, "vendor-a@portal.test");

        var (listSuccess, listBody, _) = await GetAsync("/api/v1/portal/vendor/purchase-orders", tokenA);
        listSuccess.Should().BeTrue();
        var poIds = listBody.GetProperty("data").EnumerateArray().Select(p => p.GetProperty("id").GetString()).ToList();
        poIds.Should().Contain(poAId);
        poIds.Should().NotContain(poBId);

        var (getOwnSuccess, _, _) = await GetAsync($"/api/v1/portal/vendor/purchase-orders/{poAId}", tokenA);
        getOwnSuccess.Should().BeTrue();

        // Vendor A cannot access Vendor B's purchase order.
        var (getOtherSuccess, _, getOtherStatus) = await GetAsync($"/api/v1/portal/vendor/purchase-orders/{poBId}", tokenA);
        getOtherSuccess.Should().BeFalse();
        getOtherStatus.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Coworking Member Portal ----

    [Fact]
    public async Task MemberPortal_CanAccessOwnMembershipAndBookings_ButNotAnotherMembers()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-member");
        var propertyId = await CreatePropertyAsync(ownerToken, "PM-1");
        var facilityId = await CreateFacilityAsync(ownerToken, propertyId, "PM-FAC");
        var spaceId = await CreateSpaceAsync(ownerToken, facilityId, "CW-1");
        var deskId = await CreateDeskAsync(ownerToken, spaceId, "D-1");

        var memberAId = await CreateCoworkingMemberAsync(ownerToken, "Member A");
        var memberBId = await CreateCoworkingMemberAsync(ownerToken, "Member B");
        var planId = await CreateCoworkingPlanAsync(ownerToken, facilityId, "Monthly", 30, 150m);
        var membershipAId = await CreateMembershipAsync(ownerToken, memberAId, planId, DateOnly.FromDateTime(DateTime.UtcNow));
        await CreateMembershipAsync(ownerToken, memberBId, planId, DateOnly.FromDateTime(DateTime.UtcNow));

        var start = DateTimeOffset.UtcNow.AddDays(1).Date;
        var bookingAId = await CreateCoworkingBookingAsync(ownerToken, memberAId, deskId, start.AddHours(9), start.AddHours(11));
        var bookingBId = await CreateCoworkingBookingAsync(ownerToken, memberBId, deskId, start.AddHours(13), start.AddHours(15));

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "CoworkingMember", memberAId, "member-a@portal.test");

        var (membershipSuccess, membershipBody, _) = await GetAsync("/api/v1/portal/member/membership", tokenA);
        membershipSuccess.Should().BeTrue();
        membershipBody.GetProperty("data").GetProperty("id").GetString().Should().Be(membershipAId);

        var (bookingsSuccess, bookingsBody, _) = await GetAsync("/api/v1/portal/member/bookings", tokenA);
        bookingsSuccess.Should().BeTrue();
        var bookingIds = bookingsBody.GetProperty("data").EnumerateArray().Select(b => b.GetProperty("id").GetString()).ToList();
        bookingIds.Should().Contain(bookingAId);
        bookingIds.Should().NotContain(bookingBId);

        var (getOwnBookingSuccess, _, _) = await GetAsync($"/api/v1/portal/member/bookings/{bookingAId}", tokenA);
        getOwnBookingSuccess.Should().BeTrue();

        // Member A cannot access Member B's booking.
        var (getOtherBookingSuccess, _, getOtherBookingStatus) = await GetAsync($"/api/v1/portal/member/bookings/{bookingBId}", tokenA);
        getOtherBookingSuccess.Should().BeFalse();
        getOtherBookingStatus.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Agent Portal (reuses internal auth, not the PortalUser system) ----

    [Fact]
    public async Task AgentPortal_SeesOnlyOwnLeadsAndBookings_NotAnotherAgents()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("portal-agent");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var (agentAToken, agentAId) = await CreateInternalUserAsync(ownerToken, $"agent-a-{suffix}@portal-agent.test", "Sales Agent");
        var (agentBToken, agentBId) = await CreateInternalUserAsync(ownerToken, $"agent-b-{suffix}@portal-agent.test", "Sales Agent");

        var (_, leadABody, _) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Agent A Lead", email = (string?)null, phone = (string?)null, companyName = (string?)null,
            source = 0, priority = 0, notes = (string?)null, assignedToUserId = agentAId
        }, ownerToken);
        var leadAId = leadABody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, leadBBody, _) = await PostAsync("/api/v1/crm/leads", new
        {
            fullName = "Agent B Lead", email = (string?)null, phone = (string?)null, companyName = (string?)null,
            source = 0, priority = 0, notes = (string?)null, assignedToUserId = agentBId
        }, ownerToken);
        var leadBId = leadBBody.GetProperty("data").GetProperty("id").GetString()!;

        var (listSuccessA, listBodyA, _) = await GetAsync("/api/v1/agent-portal/leads", agentAToken);
        listSuccessA.Should().BeTrue();
        var leadIdsA = listBodyA.GetProperty("data").EnumerateArray().Select(l => l.GetProperty("id").GetString()).ToList();
        leadIdsA.Should().Contain(leadAId);
        // Agent A cannot see Agent B's restricted leads.
        leadIdsA.Should().NotContain(leadBId);

        var (listSuccessB, listBodyB, _) = await GetAsync("/api/v1/agent-portal/leads", agentBToken);
        listSuccessB.Should().BeTrue();
        var leadIdsB = listBodyB.GetProperty("data").EnumerateArray().Select(l => l.GetProperty("id").GetString()).ToList();
        leadIdsB.Should().Contain(leadBId);
        leadIdsB.Should().NotContain(leadAId);

        // Bookings follow the same self-scoping.
        var projectId = await CreateProjectAsync(ownerToken, "AGPRJ");
        var unitAId = await CreateInventoryUnitAsync(ownerToken, projectId, "AG-UNIT-A");
        var unitBId = await CreateInventoryUnitAsync(ownerToken, projectId, "AG-UNIT-B");
        var customerAId = await CreateCustomerAsync(ownerToken, "Agent A Customer");
        var customerBId = await CreateCustomerAsync(ownerToken, "Agent B Customer");
        var bookingAId = await CreateBookingAsync(ownerToken, customerAId, projectId, unitAId, agentAId.ToString());
        var bookingBId = await CreateBookingAsync(ownerToken, customerBId, projectId, unitBId, agentBId.ToString());

        var (bookingsSuccessA, bookingsBodyA, _) = await GetAsync("/api/v1/agent-portal/bookings", agentAToken);
        bookingsSuccessA.Should().BeTrue();
        var bookingIdsA = bookingsBodyA.GetProperty("data").EnumerateArray().Select(b => b.GetProperty("id").GetString()).ToList();
        bookingIdsA.Should().Contain(bookingAId);
        bookingIdsA.Should().NotContain(bookingBId);
    }

    // ---- Notification authorization (via the Milestone 11 notification system, reused as-is) ----

    [Fact]
    public async Task PortalUser_ReceivesOwnDocumentUploadNotification_ButNotAnotherActors()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-notif");
        var customerAId = await CreateCustomerAsync(ownerToken, "Notif Customer A");
        var customerBId = await CreateCustomerAsync(ownerToken, "Notif Customer B");

        var (_, tokenA) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerAId, "notif-customer-a@portal.test");
        var (_, tokenB) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerBId, "notif-customer-b@portal.test");

        // Uploading a document linked to Customer A's own record triggers DocumentService's portal-notification hook.
        await PostFormAsync(
            "/api/v1/documents",
            new Dictionary<string, string> { ["EntityType"] = "Customer", ["EntityId"] = customerAId, ["Category"] = "0", ["Title"] = "Contract", ["Description"] = "" },
            (System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\nfake\n"), "contract.pdf", "application/pdf"), ownerToken);

        var (unreadSuccessA, unreadBodyA, _) = await GetAsync("/api/v1/portal/customer/notifications/unread-count", tokenA);
        unreadSuccessA.Should().BeTrue();
        unreadBodyA.GetProperty("data").GetInt32().Should().BeGreaterThan(0);

        var (unreadSuccessB, unreadBodyB, _) = await GetAsync("/api/v1/portal/customer/notifications/unread-count", tokenB);
        unreadSuccessB.Should().BeTrue();
        unreadBodyB.GetProperty("data").GetInt32().Should().Be(0);

        var (listSuccessA, listBodyA, _) = await GetAsync("/api/v1/portal/customer/notifications", tokenA);
        listSuccessA.Should().BeTrue();
        var notificationId = listBodyA.GetProperty("data").EnumerateArray().First().GetProperty("id").GetString()!;

        // Customer A can mark their own notification read.
        var (markSuccess, _, _) = await PostAsync($"/api/v1/portal/customer/notifications/{notificationId}/read", new { }, tokenA);
        markSuccess.Should().BeTrue();

        // Customer B cannot mark Customer A's notification read (scoped by the ambient portal user id — same guarantee as the internal Notifications system).
        var (markOtherSuccess, _, markOtherStatus) = await PostAsync($"/api/v1/portal/customer/notifications/{notificationId}/read", new { }, tokenB);
        markOtherSuccess.Should().BeFalse();
        markOtherStatus.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Portal accounts admin surface (internal-staff side) ----

    [Fact]
    public async Task PortalAccounts_InviteIsIdempotentPerActor_AndDeactivateBlocksLogin()
    {
        var (ownerToken, _, _, slug) = await CreateOrganizationWithSlugAsync("portal-accounts");
        var customerId = await CreateCustomerAsync(ownerToken, "Managed Customer");

        var (portalUserId, portalToken) = await InviteAndLoginPortalUserAsync(ownerToken, slug, "Customer", customerId, "managed-customer@portal.test");
        portalToken.Should().NotBeNullOrEmpty();

        // A second invite for the same actor is rejected.
        var (dupInviteSuccess, _, dupInviteStatus) = await PostAsync("/api/v1/portal-accounts/invite", new
        {
            actorType = "Customer", actorId = Guid.Parse(customerId), email = "another-email@portal.test"
        }, ownerToken);
        dupInviteSuccess.Should().BeFalse();
        dupInviteStatus.Should().Be(HttpStatusCode.BadRequest);

        var (deactivateSuccess, _, _) = await PostAsync($"/api/v1/portal-accounts/{portalUserId}/deactivate", new { }, ownerToken);
        deactivateSuccess.Should().BeTrue();

        var (loginAfterDeactivateSuccess, _, loginAfterDeactivateStatus) = await PortalLoginAsync(slug, "managed-customer@portal.test", DefaultPassword);
        loginAfterDeactivateSuccess.Should().BeFalse();
        loginAfterDeactivateStatus.Should().Be(HttpStatusCode.Unauthorized);

        var (reactivateSuccess, _, _) = await PostAsync($"/api/v1/portal-accounts/{portalUserId}/reactivate", new { }, ownerToken);
        reactivateSuccess.Should().BeTrue();

        var (loginAfterReactivateSuccess, _, _) = await PortalLoginAsync(slug, "managed-customer@portal.test", DefaultPassword);
        loginAfterReactivateSuccess.Should().BeTrue();
    }
}
