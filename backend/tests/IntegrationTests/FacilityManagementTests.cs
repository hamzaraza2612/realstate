using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class FacilityManagementTests : TestBase
{
    public FacilityManagementTests(CustomWebApplicationFactory factory) : base(factory) { }

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

    private async Task<string> CreateFacilityAsync(string token, string propertyId, string code, int type = 0)
    {
        var (_, body, _) = await PostAsync("/api/v1/facilities", new
        {
            code, propertyId = Guid.Parse(propertyId), type, name = $"Facility {code}", description = (string?)null,
            addressLine = (string?)null, city = (string?)null, managerUserId = (Guid?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateTenantAsync(string token, string fullName)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/tenants", new
        {
            customerId = (Guid?)null, fullName, email = $"{fullName.Replace(" ", "").ToLowerInvariant()}@mall.test",
            phone = (string?)null, address = (string?)null, isCompany = false, identificationNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task Facility_CanBeCreatedUpdatedAndDeleted()
    {
        var (token, _, _) = await CreateOrganizationAsync("fac-crud");
        var propertyId = await CreatePropertyAsync(token, "FC-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "FAC-1");

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/facilities/{facilityId}", new
        {
            name = "Renamed Facility", status = 1, description = "updated", addressLine = (string?)null, city = (string?)null, managerUserId = (Guid?)null
        }, token);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/facilities/{facilityId}", token);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Space_CrudAndUniqueCodePerFacility()
    {
        var (token, _, _) = await CreateOrganizationAsync("space-crud");
        var propertyId = await CreatePropertyAsync(token, "SC-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "SC-FAC");

        var (_, spaceBody, _) = await PostAsync("/api/v1/facility/spaces", new
        {
            facilityId = Guid.Parse(facilityId), propertyUnitId = (Guid?)null, buildingBlock = (string?)null,
            code = "S-1", type = 4, areaSize = (decimal?)null, capacity = 10, rate = (decimal?)null, metadataJson = (string?)null
        }, token);
        var spaceId = spaceBody.GetProperty("data").GetProperty("id").GetString()!;

        var (dupSuccess, _, dupStatus) = await PostAsync("/api/v1/facility/spaces", new
        {
            facilityId = Guid.Parse(facilityId), propertyUnitId = (Guid?)null, buildingBlock = (string?)null,
            code = "S-1", type = 4, areaSize = (decimal?)null, capacity = (int?)null, rate = (decimal?)null, metadataJson = (string?)null
        }, token);
        dupSuccess.Should().BeFalse();
        dupStatus.Should().Be(HttpStatusCode.BadRequest);

        var (statusSuccess, statusBody, _) = await PostAsync($"/api/v1/facility/spaces/{spaceId}/status", new { status = 3 }, token);
        statusSuccess.Should().BeTrue();
        statusBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3);

        var (occupiedSuccess, _, occupiedStatus) = await PostAsync($"/api/v1/facility/spaces/{spaceId}/status", new { status = 2 }, token);
        occupiedSuccess.Should().BeFalse();
        occupiedStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MallWorkflow_ShopCreation_LeaseAssignment_ServiceChargeGeneration_AndPayment()
    {
        var (token, _, _) = await CreateOrganizationAsync("mall-flow");
        var propertyId = await CreatePropertyAsync(token, "MF-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "MALL-1", type: 0);

        var (_, shopBody, _) = await PostAsync("/api/v1/facility/mall/shops", new
        {
            facilityId = Guid.Parse(facilityId), buildingBlock = "Ground Floor", code = "G-01",
            areaSize = 500m, rate = 20m, tradeCategory = "Apparel", storefrontName = "Fashion Hub", notes = (string?)null
        }, token);
        var shopSpaceId = shopBody.GetProperty("data").GetProperty("spaceId").GetString()!;
        var propertyUnitId = shopBody.GetProperty("data").GetProperty("propertyUnitId").GetString()!;
        shopBody.GetProperty("data").GetProperty("tradeCategory").GetString().Should().Be("Apparel");

        var tenantId = await CreateTenantAsync(token, "Fashion Hub Tenant");
        var start = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = start.AddMonths(2).AddDays(-1);
        var (_, leaseBody, _) = await PostAsync("/api/v1/property/leases", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(propertyUnitId), rentalTenantId = Guid.Parse(tenantId),
            startDate = start, endDate = end, rentAmount = 5000m, securityDeposit = 0m, paymentFrequency = 0, gracePeriodDays = 5,
            terms = (string?)null, notes = (string?)null
        }, token);
        var leaseId = leaseBody.GetProperty("data").GetProperty("id").GetString()!;
        (await PostAsync($"/api/v1/property/leases/{leaseId}/submit", new { }, token)).Success.Should().BeTrue();
        (await PostAsync($"/api/v1/property/leases/{leaseId}/approve", new { }, token)).Success.Should().BeTrue();

        var (_, shopAfterLease, _) = await GetAsync($"/api/v1/facility/mall/shops/{shopSpaceId}", token);
        shopAfterLease.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Occupied
        shopAfterLease.GetProperty("data").GetProperty("currentLeaseStatus").GetInt32().Should().Be(2); // Active

        var (_, definitionBody, _) = await PostAsync("/api/v1/facility/mall/service-charges/definitions", new
        {
            facilityId = Guid.Parse(facilityId), name = "CAM Charge", calculationType = 1, amount = 2m, billingFrequency = 0
        }, token);
        var definitionId = definitionBody.GetProperty("data").GetProperty("id").GetString()!;

        var (generateSuccess, chargeBody, _) = await PostAsync("/api/v1/facility/mall/service-charges/charges/generate", new
        {
            serviceChargeDefinitionId = Guid.Parse(definitionId), leaseId = Guid.Parse(leaseId), periodStart = start, periodEnd = end, dueDate = start
        }, token);
        generateSuccess.Should().BeTrue();
        // Deterministic: PerAreaUnit (2/unit) * 500 area = 1000.
        chargeBody.GetProperty("data").GetProperty("amount").GetDecimal().Should().Be(1000m);
        var chargeId = chargeBody.GetProperty("data").GetProperty("id").GetString()!;

        var (dupGenSuccess, _, dupGenStatus) = await PostAsync("/api/v1/facility/mall/service-charges/charges/generate", new
        {
            serviceChargeDefinitionId = Guid.Parse(definitionId), leaseId = Guid.Parse(leaseId), periodStart = start, periodEnd = end, dueDate = start
        }, token);
        dupGenSuccess.Should().BeFalse();
        dupGenStatus.Should().Be(HttpStatusCode.Conflict);

        var (paySuccess, payBody, _) = await PostAsync("/api/v1/facility/payments", new
        {
            sourceType = 0, sourceId = Guid.Parse(chargeId), amount = 1000m, paymentDate = start, method = 0,
            referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        paySuccess.Should().BeTrue();
        var journalEntryId = payBody.GetProperty("data").GetProperty("journalEntryId").GetString();
        journalEntryId.Should().NotBeNull();

        var (_, journalBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{journalEntryId}", token);
        journalBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(1000m);
        journalBody.GetProperty("data").GetProperty("totalCredit").GetDecimal().Should().Be(1000m);
    }

    [Fact]
    public async Task Parking_AllocationLifecycle_AndPayment()
    {
        var (token, _, _) = await CreateOrganizationAsync("parking-life");
        var propertyId = await CreatePropertyAsync(token, "PK-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "PK-FAC");

        var (_, spaceBody, _) = await PostAsync("/api/v1/facility/mall/parking/spaces", new { facilityId = Guid.Parse(facilityId), code = "P-01" }, token);
        var parkingSpaceId = spaceBody.GetProperty("data").GetProperty("id").GetString()!;

        var (allocSuccess, allocBody, _) = await PostAsync("/api/v1/facility/mall/parking/allocations", new
        {
            parkingSpaceId = Guid.Parse(parkingSpaceId), rentalTenantId = (Guid?)null, vehicleReference = "ABC-123",
            startDate = DateOnly.FromDateTime(DateTime.UtcNow), amount = 50m, notes = (string?)null
        }, token);
        allocSuccess.Should().BeTrue();
        var allocationId = allocBody.GetProperty("data").GetProperty("id").GetString()!;

        var (dupAllocSuccess, _, dupAllocStatus) = await PostAsync("/api/v1/facility/mall/parking/allocations", new
        {
            parkingSpaceId = Guid.Parse(parkingSpaceId), rentalTenantId = (Guid?)null, vehicleReference = "XYZ-999",
            startDate = DateOnly.FromDateTime(DateTime.UtcNow), amount = 50m, notes = (string?)null
        }, token);
        dupAllocSuccess.Should().BeFalse();
        dupAllocStatus.Should().Be(HttpStatusCode.BadRequest);

        var (paySuccess, _, _) = await PostAsync("/api/v1/facility/payments", new
        {
            sourceType = 1, sourceId = Guid.Parse(allocationId), amount = 50m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        paySuccess.Should().BeTrue();

        var (endSuccess, endBody, _) = await PostAsync($"/api/v1/facility/mall/parking/allocations/{allocationId}/end", new { }, token);
        endSuccess.Should().BeTrue();
        endBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Ended

        var (_, freedSpaceList, _) = await GetAsync("/api/v1/facility/mall/parking/spaces", token);
        var freedSpace = freedSpaceList.GetProperty("data").EnumerateArray().First(s => s.GetProperty("id").GetString() == parkingSpaceId);
        freedSpace.GetProperty("status").GetInt32().Should().Be(0); // Available again
    }

    [Fact]
    public async Task Event_And_Notice_Lifecycle()
    {
        var (token, _, _) = await CreateOrganizationAsync("event-notice");
        var propertyId = await CreatePropertyAsync(token, "EN-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "EN-FAC");

        var start = DateTimeOffset.UtcNow.AddDays(5);
        var (eventSuccess, eventBody, _) = await PostAsync("/api/v1/facility/mall/events", new
        {
            facilityId = Guid.Parse(facilityId), title = "Summer Sale", startAt = start, endAt = start.AddHours(4),
            location = "Atrium", organizer = "Marketing", notes = (string?)null
        }, token);
        eventSuccess.Should().BeTrue();
        var eventId = eventBody.GetProperty("data").GetProperty("id").GetString()!;

        var (eventStatusSuccess, eventStatusBody, _) = await PostAsync($"/api/v1/facility/mall/events/{eventId}/status", new { status = 1 }, token);
        eventStatusSuccess.Should().BeTrue();
        eventStatusBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Ongoing

        var (noticeSuccess, noticeBody, _) = await PostAsync("/api/v1/facility/mall/notices", new
        {
            facilityId = Guid.Parse(facilityId), rentalTenantId = (Guid?)null, subject = "Fire drill",
            content = "Fire drill scheduled next week.", noticeDate = DateOnly.FromDateTime(DateTime.UtcNow)
        }, token);
        noticeSuccess.Should().BeTrue();
        var noticeId = noticeBody.GetProperty("data").GetProperty("id").GetString()!;

        var (noticeStatusSuccess, noticeStatusBody, _) = await PostAsync($"/api/v1/facility/mall/notices/{noticeId}/status", new { status = 2 }, token);
        noticeStatusSuccess.Should().BeTrue();
        noticeStatusBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Acknowledged
    }

    private async Task<(string FacilityId, string SpaceId, string MemberId)> SetupCoworkingContextAsync(string token, string prefix)
    {
        var propertyId = await CreatePropertyAsync(token, $"{prefix}-P");
        var facilityId = await CreateFacilityAsync(token, propertyId, $"{prefix}-FAC", type: 1);
        var (_, spaceBody, _) = await PostAsync("/api/v1/facility/spaces", new
        {
            facilityId = Guid.Parse(facilityId), propertyUnitId = (Guid?)null, buildingBlock = (string?)null,
            code = "CW-1", type = 2, areaSize = (decimal?)null, capacity = 20, rate = 5m, metadataJson = (string?)null
        }, token);
        var spaceId = spaceBody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, memberBody, _) = await PostAsync("/api/v1/facility/coworking/members", new
        {
            customerId = (Guid?)null, fullName = $"{prefix} Member", email = (string?)null, phone = (string?)null, notes = (string?)null
        }, token);
        var memberId = memberBody.GetProperty("data").GetProperty("id").GetString()!;
        return (facilityId, spaceId, memberId);
    }

    [Fact]
    public async Task Coworking_MembershipLifecycle_AndPayment_PostsFinanceJournal()
    {
        var (token, _, _) = await CreateOrganizationAsync("cw-member");
        var (facilityId, _, memberId) = await SetupCoworkingContextAsync(token, "member-life");

        var (_, planBody, _) = await PostAsync("/api/v1/facility/coworking/plans", new
        {
            facilityId = Guid.Parse(facilityId), name = "Monthly Plan", durationDays = 30, price = 150m, includedHoursCredits = (decimal?)null
        }, token);
        var planId = planBody.GetProperty("data").GetProperty("id").GetString()!;

        var (msSuccess, msBody, _) = await PostAsync("/api/v1/facility/coworking/memberships", new
        {
            memberId = Guid.Parse(memberId), planId = Guid.Parse(planId), startDate = DateOnly.FromDateTime(DateTime.UtcNow)
        }, token);
        msSuccess.Should().BeTrue();
        var membershipId = msBody.GetProperty("data").GetProperty("id").GetString()!;
        msBody.GetProperty("data").GetProperty("amount").GetDecimal().Should().Be(150m);

        var (paySuccess, payBody, _) = await PostAsync("/api/v1/facility/payments", new
        {
            sourceType = 2, sourceId = Guid.Parse(membershipId), amount = 150m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey = (string?)null
        }, token);
        paySuccess.Should().BeTrue();
        var journalEntryId = payBody.GetProperty("data").GetProperty("journalEntryId").GetString();

        var (_, journalBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{journalEntryId}", token);
        journalBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(150m);

        var (cancelSuccess, cancelBody, _) = await PostAsync($"/api/v1/facility/coworking/memberships/{membershipId}/status", new { status = 2 }, token);
        cancelSuccess.Should().BeTrue();
        cancelBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Cancelled

        var (reactivateSuccess, _, reactivateStatus) = await PostAsync($"/api/v1/facility/coworking/memberships/{membershipId}/status", new { status = 0 }, token);
        reactivateSuccess.Should().BeFalse();
        reactivateStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Booking_CreateAndOverlapRejected_ThenNonOverlappingSucceeds_AndPaymentIsIdempotent()
    {
        var (token, _, _) = await CreateOrganizationAsync("booking-flow");
        var (_, spaceId, memberId) = await SetupCoworkingContextAsync(token, "booking-1");

        var (_, deskBody, _) = await PostAsync("/api/v1/facility/coworking/desks", new { spaceId = Guid.Parse(spaceId), code = "D-1", type = 0 }, token);
        var deskId = deskBody.GetProperty("data").GetProperty("id").GetString()!;

        var start = DateTimeOffset.UtcNow.AddDays(1).Date;
        var (firstSuccess, firstBody, _) = await PostAsync("/api/v1/facility/coworking/bookings", new
        {
            memberId = Guid.Parse(memberId), resourceType = 0, resourceId = Guid.Parse(deskId),
            startAt = start.AddHours(9), endAt = start.AddHours(11), notes = (string?)null
        }, token);
        firstSuccess.Should().BeTrue();
        firstBody.GetProperty("data").GetProperty("price").GetDecimal().Should().Be(10m); // 2h * rate 5
        var firstBookingId = firstBody.GetProperty("data").GetProperty("id").GetString()!;

        var (overlapSuccess, _, overlapStatus) = await PostAsync("/api/v1/facility/coworking/bookings", new
        {
            memberId = Guid.Parse(memberId), resourceType = 0, resourceId = Guid.Parse(deskId),
            startAt = start.AddHours(10), endAt = start.AddHours(12), notes = (string?)null
        }, token);
        overlapSuccess.Should().BeFalse();
        overlapStatus.Should().Be(HttpStatusCode.Conflict);

        var (nonOverlapSuccess, _, _) = await PostAsync("/api/v1/facility/coworking/bookings", new
        {
            memberId = Guid.Parse(memberId), resourceType = 0, resourceId = Guid.Parse(deskId),
            startAt = start.AddHours(11), endAt = start.AddHours(13), notes = (string?)null
        }, token);
        nonOverlapSuccess.Should().BeTrue();

        var idempotencyKey = Guid.NewGuid().ToString();
        var (pay1Success, pay1Body, _) = await PostAsync("/api/v1/facility/payments", new
        {
            sourceType = 3, sourceId = Guid.Parse(firstBookingId), amount = 10m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey
        }, token);
        pay1Success.Should().BeTrue();
        var firstPaymentId = pay1Body.GetProperty("data").GetProperty("id").GetString();

        var (pay2Success, pay2Body, _) = await PostAsync("/api/v1/facility/payments", new
        {
            sourceType = 3, sourceId = Guid.Parse(firstBookingId), amount = 10m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey
        }, token);
        pay2Success.Should().BeTrue();
        pay2Body.GetProperty("data").GetProperty("id").GetString().Should().Be(firstPaymentId);

        var (_, paymentsList, _) = await GetAsync($"/api/v1/facility/payments?sourceType=3&sourceId={firstBookingId}", token);
        paymentsList.GetProperty("data").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task UtilityReading_ValidationRejectsDecrease_AndComputesConsumption()
    {
        var (token, _, _) = await CreateOrganizationAsync("utility-read");
        var propertyId = await CreatePropertyAsync(token, "UR-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "UR-FAC");

        var (firstSuccess, firstBody, _) = await PostAsync("/api/v1/facility/utility-readings", new
        {
            facilityId = Guid.Parse(facilityId), propertyId = (Guid?)null, type = 0, meterReference = "MTR-1",
            readingValue = 1000m, readingDate = DateOnly.FromDateTime(DateTime.UtcNow), ratePerUnit = 0.5m
        }, token);
        firstSuccess.Should().BeTrue();
        firstBody.GetProperty("data").GetProperty("consumption").GetDecimal().Should().Be(0m);

        var (secondSuccess, secondBody, _) = await PostAsync("/api/v1/facility/utility-readings", new
        {
            facilityId = Guid.Parse(facilityId), propertyId = (Guid?)null, type = 0, meterReference = "MTR-1",
            readingValue = 1200m, readingDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30), ratePerUnit = 0.5m
        }, token);
        secondSuccess.Should().BeTrue();
        secondBody.GetProperty("data").GetProperty("consumption").GetDecimal().Should().Be(200m);
        secondBody.GetProperty("data").GetProperty("amount").GetDecimal().Should().Be(100m);

        var (invalidSuccess, _, invalidStatus) = await PostAsync("/api/v1/facility/utility-readings", new
        {
            facilityId = Guid.Parse(facilityId), propertyId = (Guid?)null, type = 0, meterReference = "MTR-1",
            readingValue = 900m, readingDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(60), ratePerUnit = 0.5m
        }, token);
        invalidSuccess.Should().BeFalse();
        invalidStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ServiceRequest_Lifecycle_ReusesMaintenanceStatusRules()
    {
        var (token, _, _) = await CreateOrganizationAsync("svc-req");
        var propertyId = await CreatePropertyAsync(token, "SR-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "SR-FAC");

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/facility/service-requests", new
        {
            facilityId = Guid.Parse(facilityId), spaceId = (Guid?)null, requesterCustomerId = (Guid?)null,
            category = 0, priority = 1, description = "Spill in lobby", reportedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            assignedToUserId = (Guid?)null, assignedVendorId = (Guid?)null
        }, token);
        createSuccess.Should().BeTrue();
        var requestId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        (await PostAsync($"/api/v1/facility/service-requests/{requestId}/status", new { status = 1, resolutionNotes = (string?)null }, token)).Success.Should().BeTrue();
        var (resolveSuccess, resolveBody, _) = await PostAsync($"/api/v1/facility/service-requests/{requestId}/status", new { status = 4, resolutionNotes = (string?)null }, token);
        resolveSuccess.Should().BeFalse(); // Assigned -> Resolved is not a valid MaintenanceStatusRules transition (must go via InProgress)
        resolveBody.GetProperty("code").GetString().Should().Be("invalid_transition");

        (await PostAsync($"/api/v1/facility/service-requests/{requestId}/status", new { status = 2, resolutionNotes = (string?)null }, token)).Success.Should().BeTrue();
        var (finalResolveSuccess, finalResolveBody, _) = await PostAsync($"/api/v1/facility/service-requests/{requestId}/status", new { status = 4, resolutionNotes = "Cleaned" }, token);
        finalResolveSuccess.Should().BeTrue();
        finalResolveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(4);
    }

    [Fact]
    public async Task FacilityMaintenance_ReusesExistingMaintenanceRequestInfrastructure()
    {
        var (token, _, _) = await CreateOrganizationAsync("fac-maint");
        var propertyId = await CreatePropertyAsync(token, "FM-1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "FM-FAC");
        var (_, spaceBody, _) = await PostAsync("/api/v1/facility/spaces", new
        {
            facilityId = Guid.Parse(facilityId), propertyUnitId = (Guid?)null, buildingBlock = (string?)null,
            code = "FM-S1", type = 4, areaSize = (decimal?)null, capacity = (int?)null, rate = (decimal?)null, metadataJson = (string?)null
        }, token);
        var spaceId = spaceBody.GetProperty("data").GetProperty("id").GetString()!;

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/property/maintenance-requests", new
        {
            propertyId = (Guid?)null, unitId = (Guid?)null, facilityId = Guid.Parse(facilityId), spaceId = Guid.Parse(spaceId),
            rentalTenantId = (Guid?)null, category = 0, priority = 2, description = "AC not cooling",
            reportedDate = DateOnly.FromDateTime(DateTime.UtcNow), assignedToUserId = (Guid?)null, assignedVendorId = (Guid?)null, slaHours = 24
        }, token);
        createSuccess.Should().BeTrue();
        createBody.GetProperty("data").GetProperty("propertyId").GetString().Should().Be(propertyId); // derived from Facility.PropertyId
        createBody.GetProperty("data").GetProperty("facilityId").GetString().Should().Be(facilityId);
        createBody.GetProperty("data").GetProperty("slaDueAt").ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task FacilityMallCoworkingData_AreIsolatedPerTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("fac-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("fac-iso-b");
        var propertyIdA = await CreatePropertyAsync(tokenA, "ISO-A");
        var facilityIdA = await CreateFacilityAsync(tokenA, propertyIdA, "ISO-FAC-A");

        var (bListSuccess, bListBody, _) = await GetAsync("/api/v1/facilities", tokenB);
        bListSuccess.Should().BeTrue();
        bListBody.GetProperty("data").EnumerateArray().Any(f => f.GetProperty("id").GetString() == facilityIdA).Should().BeFalse();

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/facilities/{facilityIdA}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SalesAgent_CannotAccessFacility_ButFacilityManagerCan()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("fac-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var agentEmail = $"agent-{suffix}@fac-rbac.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var managerEmail = $"manager-{suffix}@fac-rbac.test";
        await PostAsync("/api/v1/users", new { email = managerEmail, fullName = "Manager", password = "Manager@12345", phoneNumber = (string?)null, roleNames = new[] { "Facility Manager" } }, ownerToken);
        var managerToken = await LoginAsync(managerEmail, "Manager@12345");

        var (agentSuccess, _, agentStatus) = await GetAsync("/api/v1/facilities", agentToken);
        agentSuccess.Should().BeFalse();
        agentStatus.Should().Be(HttpStatusCode.Forbidden);

        var propertyId = await CreatePropertyAsync(ownerToken, "RBAC-P");
        var (managerSuccess, _, managerStatus) = await PostAsync("/api/v1/facilities", new
        {
            code = "RBAC-FAC", propertyId = Guid.Parse(propertyId), type = 0, name = "Manager Facility",
            description = (string?)null, addressLine = (string?)null, city = (string?)null, managerUserId = (Guid?)null
        }, managerToken);
        managerSuccess.Should().BeTrue();
        managerStatus.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task FacilityMallCoworkingDashboards_AreTenantScoped()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("dash-fac-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("dash-fac-b");
        await SetupCoworkingContextAsync(tokenA, "dash-cw-a");

        var (facSuccessA, facBodyA, _) = await GetAsync("/api/v1/facility/dashboard", tokenA);
        facSuccessA.Should().BeTrue();
        facBodyA.GetProperty("data").GetProperty("totalFacilities").GetInt32().Should().BeGreaterThan(0);

        var (facSuccessB, facBodyB, _) = await GetAsync("/api/v1/facility/dashboard", tokenB);
        facSuccessB.Should().BeTrue();
        facBodyB.GetProperty("data").GetProperty("totalFacilities").GetInt32().Should().Be(0);

        var (cwSuccessA, cwBodyA, _) = await GetAsync("/api/v1/facility/coworking/dashboard", tokenA);
        cwSuccessA.Should().BeTrue();
        cwBodyA.GetProperty("data").GetProperty("totalDesks").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var (mallSuccessB, mallBodyB, _) = await GetAsync("/api/v1/facility/mall/dashboard", tokenB);
        mallSuccessB.Should().BeTrue();
        mallBodyB.GetProperty("data").GetProperty("totalShops").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task AuditLog_RecordsFacilityActions()
    {
        var (token, _, _) = await CreateOrganizationAsync("audit-fac");
        var propertyId = await CreatePropertyAsync(token, "AUD-1");
        await CreateFacilityAsync(token, propertyId, "AUD-FAC");

        var (auditSuccess, auditBody, _) = await GetAsync("/api/v1/audit-logs?module=Facility", token);
        auditSuccess.Should().BeTrue();
        auditBody.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
    }
}
