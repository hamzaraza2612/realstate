using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class PropertyRentalTests : TestBase
{
    public PropertyRentalTests(CustomWebApplicationFactory factory) : base(factory) { }

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

    private async Task<string> CreateTenantAsync(string token, string fullName)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/tenants", new
        {
            customerId = (Guid?)null, fullName, email = (string?)$"{fullName.Replace(" ", "").ToLowerInvariant()}@tenant.test",
            phone = (string?)null, address = (string?)null, isCompany = false, identificationNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<(string PropertyId, string UnitId, string TenantId)> SetupPropertyContextAsync(string token, string prefix)
    {
        var propertyId = await CreatePropertyAsync(token, prefix.ToUpperInvariant());
        var unitId = await CreateUnitAsync(token, propertyId, "U-101", 1000m);
        var tenantId = await CreateTenantAsync(token, $"{prefix} Tenant");
        return (propertyId, unitId, tenantId);
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

    [Fact]
    public async Task Property_CanBeCreatedUpdatedAndDeleted()
    {
        var (token, _, _) = await CreateOrganizationAsync("prop-crud");
        var propertyId = await CreatePropertyAsync(token, "PC-1");

        var (dupSuccess, _, dupStatus) = await PostAsync("/api/v1/property/properties", new
        {
            code = "PC-1", name = "Dup", type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            ownerName = (string?)null, ownerContact = (string?)null
        }, token);
        dupSuccess.Should().BeFalse();
        dupStatus.Should().Be(HttpStatusCode.BadRequest);

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/property/properties/{propertyId}", new
        {
            name = "Renamed", status = 1, description = "updated", addressLine = (string?)null, city = (string?)null,
            state = (string?)null, country = (string?)null, postalCode = (string?)null, ownerName = (string?)null, ownerContact = (string?)null
        }, token);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/property/properties/{propertyId}", token);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PropertyUnit_CrudAndUniqueUnitNumberPerProperty()
    {
        var (token, _, _) = await CreateOrganizationAsync("unit-crud");
        var propertyId = await CreatePropertyAsync(token, "UC-1");
        var unitId = await CreateUnitAsync(token, propertyId, "101");

        var (dupSuccess, _, dupStatus) = await PostAsync("/api/v1/property/units", new
        {
            propertyId = Guid.Parse(propertyId), buildingBlock = (string?)null, unitNumber = "101", type = 0, floor = (string?)null,
            areaSize = (decimal?)null, areaUnit = (string?)null, bedrooms = (int?)null, marketRentRate = (decimal?)null, metadataJson = (string?)null
        }, token);
        dupSuccess.Should().BeFalse();
        dupStatus.Should().Be(HttpStatusCode.BadRequest);

        var (statusSuccess, statusBody, _) = await PostAsync($"/api/v1/property/units/{unitId}/status", new { status = 3 }, token); // Maintenance
        statusSuccess.Should().BeTrue();
        statusBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task RentalTenant_ReusesExistingCustomer_AndRejectsDuplicateLink()
    {
        var (token, _, _) = await CreateOrganizationAsync("tenant-reuse");

        var (_, customerBody, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = "Existing Customer", email = "existing@customer.test", phone = (string?)null, address = (string?)null, companyName = (string?)null
        }, token);
        var customerId = customerBody.GetProperty("data").GetProperty("id").GetString()!;

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/property/tenants", new
        {
            customerId = Guid.Parse(customerId), fullName = (string?)null, email = (string?)null, phone = (string?)null,
            address = (string?)null, isCompany = false, identificationNumber = (string?)null, notes = (string?)null
        }, token);
        createSuccess.Should().BeTrue();
        createBody.GetProperty("data").GetProperty("customerName").GetString().Should().Be("Existing Customer");

        var (dupSuccess, _, dupStatus) = await PostAsync("/api/v1/property/tenants", new
        {
            customerId = Guid.Parse(customerId), fullName = (string?)null, email = (string?)null, phone = (string?)null,
            address = (string?)null, isCompany = false, identificationNumber = (string?)null, notes = (string?)null
        }, token);
        dupSuccess.Should().BeFalse();
        dupStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Lease_InvalidDateRange_IsRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("lease-date");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "date-1");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var (success, _, status) = await PostAsync("/api/v1/property/leases", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(unitId), rentalTenantId = Guid.Parse(tenantId),
            startDate = today, endDate = today, rentAmount = 1000m, securityDeposit = 0m,
            paymentFrequency = 0, gracePeriodDays = 0, terms = (string?)null, notes = (string?)null
        }, token);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Lease_FullLifecycle_GeneratesRentScheduleAndOccupiesUnit()
    {
        var (token, _, _) = await CreateOrganizationAsync("lease-life");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "life-1");
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(3).AddDays(-1);

        var leaseId = await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, end, rent: 1000m, deposit: 500m);
        await ActivateLeaseAsync(token, leaseId);

        var (unitSuccess, unitBody, _) = await GetAsync($"/api/v1/property/units/{unitId}", token);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Occupied

        var (scheduleSuccess, scheduleBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/rent-schedule", token);
        scheduleSuccess.Should().BeTrue();
        var lines = scheduleBody.GetProperty("data").EnumerateArray().ToList();
        lines.Should().HaveCount(3);
        lines.Sum(l => l.GetProperty("amount").GetDecimal()).Should().Be(3000m);

        var (depositSuccess, depositBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/security-deposit", token);
        depositSuccess.Should().BeTrue();
        depositBody.GetProperty("data").GetProperty("amount").GetDecimal().Should().Be(500m);
        depositBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Pending
    }

    [Fact]
    public async Task Lease_ConflictingActiveLease_IsRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("lease-conflict");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "conf-1");
        var tenant2Id = await CreateTenantAsync(token, "Second Tenant");
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(2).AddDays(-1);

        await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, end);

        var (conflictSuccess, _, conflictStatus) = await PostAsync("/api/v1/property/leases", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(unitId), rentalTenantId = Guid.Parse(tenant2Id),
            startDate = start, endDate = end, rentAmount = 900m, securityDeposit = 0m,
            paymentFrequency = 0, gracePeriodDays = 0, terms = (string?)null, notes = (string?)null
        }, token);
        conflictSuccess.Should().BeFalse();
        conflictStatus.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Lease_Termination_ReleasesUnitToAvailable_AndInvalidTransitionRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("lease-term");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "term-1");
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(2).AddDays(-1);

        var leaseId = await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, end);
        await ActivateLeaseAsync(token, leaseId);

        var (terminateSuccess, terminateBody, _) = await PostAsync($"/api/v1/property/leases/{leaseId}/terminate", new { }, token);
        terminateSuccess.Should().BeTrue();
        terminateBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(4); // Terminated

        var (unitSuccess, unitBody, _) = await GetAsync($"/api/v1/property/units/{unitId}", token);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Available

        var (invalidSuccess, _, invalidStatus) = await PostAsync($"/api/v1/property/leases/{leaseId}/approve", new { }, token);
        invalidSuccess.Should().BeFalse();
        invalidStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<(string LeaseId, string ScheduleId)> ActivatedLeaseWithScheduleAsync(string token, string prefix, decimal rent = 1000m)
    {
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, prefix);
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(1).AddDays(-1);
        var leaseId = await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, end, rent: rent, deposit: 0m);
        await ActivateLeaseAsync(token, leaseId);

        var (_, scheduleBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/rent-schedule", token);
        var scheduleId = scheduleBody.GetProperty("data").EnumerateArray().First().GetProperty("id").GetString()!;
        return (leaseId, scheduleId);
    }

    [Fact]
    public async Task RentPayment_PartialThenFull_UpdatesScheduleStatus_AndPostsFinanceJournal()
    {
        var (token, _, _) = await CreateOrganizationAsync("rent-pay");
        var (leaseId, scheduleId) = await ActivatedLeaseWithScheduleAsync(token, "pay-1", rent: 1000m);

        var (firstSuccess, firstBody, _) = await PostAsync($"/api/v1/property/leases/{leaseId}/payments", new
        {
            rentScheduleId = Guid.Parse(scheduleId), amount = 400m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        firstSuccess.Should().BeTrue();
        var journalEntryId = firstBody.GetProperty("data").GetProperty("journalEntryId").GetString();
        journalEntryId.Should().NotBeNull();

        var (journalSuccess, journalBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{journalEntryId}", token);
        journalSuccess.Should().BeTrue();
        journalBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(400m);
        journalBody.GetProperty("data").GetProperty("totalCredit").GetDecimal().Should().Be(400m);

        var (_, scheduleAfterFirst, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/rent-schedule", token);
        scheduleAfterFirst.GetProperty("data").EnumerateArray().First().GetProperty("status").GetInt32().Should().Be(1); // PartiallyPaid

        var (secondSuccess, _, _) = await PostAsync($"/api/v1/property/leases/{leaseId}/payments", new
        {
            rentScheduleId = Guid.Parse(scheduleId), amount = 600m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        secondSuccess.Should().BeTrue();

        var (_, scheduleAfterSecond, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/rent-schedule", token);
        scheduleAfterSecond.GetProperty("data").EnumerateArray().First().GetProperty("status").GetInt32().Should().Be(2); // Paid
    }

    [Fact]
    public async Task RentPayment_OverpaymentRejected_AndDuplicateIdempotentRequestReturnsOriginal()
    {
        var (token, _, _) = await CreateOrganizationAsync("rent-over");
        var (leaseId, scheduleId) = await ActivatedLeaseWithScheduleAsync(token, "over-1", rent: 1000m);

        var (overSuccess, _, overStatus) = await PostAsync($"/api/v1/property/leases/{leaseId}/payments", new
        {
            rentScheduleId = Guid.Parse(scheduleId), amount = 1500m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        overSuccess.Should().BeFalse();
        overStatus.Should().Be(HttpStatusCode.BadRequest);

        var idempotencyKey = Guid.NewGuid().ToString();
        var (firstSuccess, firstBody, _) = await PostAsync($"/api/v1/property/leases/{leaseId}/payments", new
        {
            rentScheduleId = Guid.Parse(scheduleId), amount = 1000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey
        }, token);
        firstSuccess.Should().BeTrue();
        var firstPaymentId = firstBody.GetProperty("data").GetProperty("id").GetString();

        var (retrySuccess, retryBody, _) = await PostAsync($"/api/v1/property/leases/{leaseId}/payments", new
        {
            rentScheduleId = Guid.Parse(scheduleId), amount = 1000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey
        }, token);
        retrySuccess.Should().BeTrue();
        retryBody.GetProperty("data").GetProperty("id").GetString().Should().Be(firstPaymentId);

        var (_, paymentsBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/payments", token);
        paymentsBody.GetProperty("data").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task RentSchedule_OverdueCalculation_ReflectsDueDateAndGracePeriod()
    {
        var (token, _, _) = await CreateOrganizationAsync("rent-overdue");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "overdue-1");

        var start = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-2);
        var end = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1).AddDays(-1);
        var leaseId = await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, end, rent: 500m, deposit: 0m);
        await ActivateLeaseAsync(token, leaseId);

        var (_, scheduleBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/rent-schedule", token);
        var lines = scheduleBody.GetProperty("data").EnumerateArray().ToList();
        lines[0].GetProperty("isOverdue").GetBoolean().Should().BeTrue(); // due 2 months ago, unpaid, well past grace
        lines[^1].GetProperty("isOverdue").GetBoolean().Should().BeFalse(); // future period
    }

    [Fact]
    public async Task SecurityDeposit_ReceiveAndRefundLifecycle()
    {
        var (token, _, _) = await CreateOrganizationAsync("deposit-life");
        var (propertyId, unitId, tenantId) = await SetupPropertyContextAsync(token, "dep-1");
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var leaseId = await CreateLeaseAsync(token, propertyId, unitId, tenantId, start, start.AddMonths(1).AddDays(-1), deposit: 1000m);

        var (_, depositBody, _) = await GetAsync($"/api/v1/property/leases/{leaseId}/security-deposit", token);
        var depositId = depositBody.GetProperty("data").GetProperty("id").GetString()!;

        var (receiveSuccess, receiveBody, _) = await PostAsync($"/api/v1/property/security-deposits/{depositId}/receive", new
        {
            receivedDate = start, notes = (string?)null
        }, token);
        receiveSuccess.Should().BeTrue();
        receiveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Held

        var (partialSuccess, partialBody, _) = await PostAsync($"/api/v1/property/security-deposits/{depositId}/refund", new
        {
            amount = 400m, refundDate = start, notes = (string?)null
        }, token);
        partialSuccess.Should().BeTrue();
        partialBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // PartiallyRefunded

        var (overSuccess, _, overStatus) = await PostAsync($"/api/v1/property/security-deposits/{depositId}/refund", new
        {
            amount = 1000m, refundDate = start, notes = (string?)null
        }, token);
        overSuccess.Should().BeFalse();
        overStatus.Should().Be(HttpStatusCode.BadRequest);

        var (finalSuccess, finalBody, _) = await PostAsync($"/api/v1/property/security-deposits/{depositId}/refund", new
        {
            amount = 600m, refundDate = start, notes = (string?)null
        }, token);
        finalSuccess.Should().BeTrue();
        finalBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3); // Refunded
    }

    [Fact]
    public async Task Maintenance_FullLifecycle_WithVendorAssignment()
    {
        var (token, _, _) = await CreateOrganizationAsync("maint-life");
        var (propertyId, unitId, _) = await SetupPropertyContextAsync(token, "maint-1");

        var (_, vendorBody, _) = await PostAsync("/api/v1/procurement/vendors", new
        {
            name = "Maint Vendor", contactPerson = (string?)null, email = (string?)null, phone = (string?)null,
            address = (string?)null, taxRegistrationNumber = (string?)null, notes = (string?)null
        }, token);
        var vendorId = vendorBody.GetProperty("data").GetProperty("id").GetString()!;

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/property/maintenance-requests", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(unitId), tenantId = (Guid?)null,
            category = 0, priority = 2, description = "Leaking pipe", reportedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            assignedToUserId = (Guid?)null, assignedVendorId = (Guid?)null
        }, token);
        createSuccess.Should().BeTrue();
        var requestId = createBody.GetProperty("data").GetProperty("id").GetString()!;
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Open

        var (assignSuccess, assignBody, _) = await PostAsync($"/api/v1/property/maintenance-requests/{requestId}/assign", new
        {
            assignedToUserId = (Guid?)null, assignedVendorId = Guid.Parse(vendorId)
        }, token);
        assignSuccess.Should().BeTrue();
        assignBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Assigned
        assignBody.GetProperty("data").GetProperty("assignedVendorName").GetString().Should().Be("Maint Vendor");

        (await PostAsync($"/api/v1/property/maintenance-requests/{requestId}/status", new { status = 2, resolutionNotes = (string?)null, completionDate = (DateOnly?)null }, token)).Success.Should().BeTrue(); // InProgress

        var (resolveSuccess, resolveBody, _) = await PostAsync($"/api/v1/property/maintenance-requests/{requestId}/status", new
        {
            status = 4, resolutionNotes = "Fixed the pipe", completionDate = DateOnly.FromDateTime(DateTime.UtcNow)
        }, token);
        resolveSuccess.Should().BeTrue();
        resolveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(4); // Resolved
        resolveBody.GetProperty("data").GetProperty("resolutionNotes").GetString().Should().Be("Fixed the pipe");

        var (invalidSuccess, _, invalidStatus) = await PostAsync($"/api/v1/property/maintenance-requests/{requestId}/status", new
        {
            status = 1, resolutionNotes = (string?)null, completionDate = (DateOnly?)null
        }, token);
        invalidSuccess.Should().BeFalse();
        invalidStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PropertyRentalData_AreIsolatedPerTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("prop-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("prop-iso-b");
        var (propertyIdA, unitIdA, _) = await SetupPropertyContextAsync(tokenA, "iso-a");

        var (bListSuccess, bListBody, _) = await GetAsync("/api/v1/property/properties", tokenB);
        bListSuccess.Should().BeTrue();
        bListBody.GetProperty("data").EnumerateArray().Any(p => p.GetProperty("id").GetString() == propertyIdA).Should().BeFalse();

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/property/units/{unitIdA}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SalesAgent_CannotAccessProperty_ButPropertyManagerCan()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("prop-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var agentEmail = $"agent-{suffix}@prop-rbac.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var managerEmail = $"manager-{suffix}@prop-rbac.test";
        await PostAsync("/api/v1/users", new { email = managerEmail, fullName = "Manager", password = "Manager@12345", phoneNumber = (string?)null, roleNames = new[] { "Property Manager" } }, ownerToken);
        var managerToken = await LoginAsync(managerEmail, "Manager@12345");

        var (agentSuccess, _, agentStatus) = await GetAsync("/api/v1/property/properties", agentToken);
        agentSuccess.Should().BeFalse();
        agentStatus.Should().Be(HttpStatusCode.Forbidden);

        var (managerSuccess, _, managerStatus) = await PostAsync("/api/v1/property/properties", new
        {
            code = "MGR-1", name = "Manager Property", type = 0, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            ownerName = (string?)null, ownerContact = (string?)null
        }, managerToken);
        managerSuccess.Should().BeTrue();
        managerStatus.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task PropertyAndRentalDashboards_AreTenantScoped()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("dash-prop-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("dash-prop-b");
        await ActivatedLeaseWithScheduleAsync(tokenA, "dash-a", rent: 1000m);

        var (propSuccessA, propBodyA, _) = await GetAsync("/api/v1/property/dashboard", tokenA);
        propSuccessA.Should().BeTrue();
        propBodyA.GetProperty("data").GetProperty("activeLeases").GetInt32().Should().Be(1);

        var (propSuccessB, propBodyB, _) = await GetAsync("/api/v1/property/dashboard", tokenB);
        propSuccessB.Should().BeTrue();
        propBodyB.GetProperty("data").GetProperty("activeLeases").GetInt32().Should().Be(0);

        var (rentalSuccessA, rentalBodyA, _) = await GetAsync("/api/v1/property/rental-dashboard", tokenA);
        rentalSuccessA.Should().BeTrue();
        rentalBodyA.GetProperty("data").GetProperty("activeLeases").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task AuditLog_RecordsPropertyAndRentalActions()
    {
        var (token, _, _) = await CreateOrganizationAsync("audit-prop");
        await ActivatedLeaseWithScheduleAsync(token, "audit-1", rent: 500m);

        var (auditSuccess, auditBody, _) = await GetAsync("/api/v1/audit-logs?module=Property", token);
        auditSuccess.Should().BeTrue();
        auditBody.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
    }
}
