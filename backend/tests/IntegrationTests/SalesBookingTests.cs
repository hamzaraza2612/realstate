using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class SalesBookingTests : TestBase
{
    public SalesBookingTests(CustomWebApplicationFactory factory) : base(factory) { }

    private async Task<string> CreateCustomerAsync(string token, string name)
    {
        var (_, body, _) = await PostAsync("/api/v1/crm/customers", new
        {
            fullName = name,
            email = (string?)null,
            phone = (string?)null,
            address = (string?)null,
            companyName = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateProjectAsync(string token, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/projects", new
        {
            name = $"Project {code}",
            code,
            type = 0,
            description = (string?)null,
            addressLine = (string?)null,
            city = (string?)null,
            state = (string?)null,
            country = (string?)null,
            postalCode = (string?)null,
            startDate = (DateOnly?)null,
            endDate = (DateOnly?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateInventoryUnitAsync(string token, string projectId, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code,
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> GetOwnUserIdAsync(string token)
    {
        var (_, body, _) = await GetAsync("/api/v1/users", token);
        return body.GetProperty("data")[0].GetProperty("id").GetString()!;
    }

    private object BookingPayload(string customerId, string projectId, string unitId, string agentId, decimal totalPrice = 1_000_000m, decimal discount = 0m) => new
    {
        customerId = Guid.Parse(customerId),
        projectId = Guid.Parse(projectId),
        inventoryUnitId = Guid.Parse(unitId),
        salesAgentUserId = Guid.Parse(agentId),
        bookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
        totalPrice,
        discount,
        notes = (string?)null
    };

    private async Task<(string OwnerToken, string CustomerId, string ProjectId, string UnitId, string AgentId)> SetupBookingContextAsync(string prefix)
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync(prefix);
        var customerId = await CreateCustomerAsync(ownerToken, $"{prefix} Customer");
        var codeBase = prefix.ToUpperInvariant().Replace("-", "");
        var projectId = await CreateProjectAsync(ownerToken, codeBase[..Math.Min(8, codeBase.Length)]);
        var unitId = await CreateInventoryUnitAsync(ownerToken, projectId, "UNIT-1");
        var agentId = await GetOwnUserIdAsync(ownerToken);
        return (ownerToken, customerId, projectId, unitId, agentId);
    }

    [Fact]
    public async Task Owner_CanCreateBooking_AndInventoryBecomesReserved()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-create");

        var (success, body, status) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 1_000_000m, 50_000m), token);
        success.Should().BeTrue();
        status.Should().Be(HttpStatusCode.Created);
        body.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Draft
        body.GetProperty("data").GetProperty("netPrice").GetDecimal().Should().Be(950_000m);
        body.GetProperty("data").GetProperty("customerName").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("data").GetProperty("projectName").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("data").GetProperty("inventoryUnitCode").GetString().Should().Be("UNIT-1");

        var (unitSuccess, unitBody, _) = await GetAsync($"/api/v1/inventory/{unitId}", token);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Reserved
    }

    [Fact]
    public async Task CannotBookInventoryThatIsNotAvailable()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-unavail");

        await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 4 }, token); // -> Blocked

        var (success, _, status) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId), token);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DoubleBooking_ConcurrentRequests_OnlyOneSucceeds()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-race");

        var payload = BookingPayload(customerId, projectId, unitId, agentId);
        var results = await Task.WhenAll(
            PostAsync("/api/v1/sales/bookings", payload, token),
            PostAsync("/api/v1/sales/bookings", payload, token));

        results.Count(r => r.Success).Should().Be(1);
        results.Count(r => !r.Success).Should().Be(1);
        var failed = results.First(r => !r.Success);
        (failed.Status == HttpStatusCode.Conflict || failed.Status == HttpStatusCode.BadRequest).Should().BeTrue();
    }

    [Fact]
    public async Task BookingStatusTransitions_ValidAndInvalid()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-status");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        // Draft -> Confirmed directly is invalid (must go through PendingApproval)
        var (invalidApprove, _, invalidStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/approve", new { }, token);
        invalidApprove.Should().BeFalse();
        invalidStatus.Should().Be(HttpStatusCode.BadRequest);

        var (submitSuccess, submitBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/submit", new { }, token);
        submitSuccess.Should().BeTrue();
        submitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // PendingApproval

        var (approveSuccess, approveBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/approve", new { }, token);
        approveSuccess.Should().BeTrue();
        approveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Confirmed

        var (unitSuccess, unitBody, _) = await GetAsync($"/api/v1/inventory/{unitId}", token);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Booked

        // Confirmed -> Submit is invalid
        var (reSubmit, _, reSubmitStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/submit", new { }, token);
        reSubmit.Should().BeFalse();
        reSubmitStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CancellingABooking_ReleasesInventoryAndCancelsOpenInstallments()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-cancel");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 100_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Standard",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 1, // FixedAmount
            frequency = 0,
            numberOfInstallments = 2,
            gracePeriodDays = 0,
            customSchedule = (object?)null
        }, token);

        var (cancelSuccess, cancelBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/cancel", new { }, token);
        cancelSuccess.Should().BeTrue();
        cancelBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3); // Cancelled

        var (unitSuccess, unitBody, _) = await GetAsync($"/api/v1/inventory/{unitId}", token);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Available again

        var (planSuccess, planBody, _) = await GetAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", token);
        planSuccess.Should().BeTrue();
        foreach (var installment in planBody.GetProperty("data").GetProperty("installments").EnumerateArray())
        {
            installment.GetProperty("status").GetInt32().Should().Be(4); // Cancelled
        }

        // Cancelled -> Cancelled again is invalid
        var (reCancel, _, reCancelStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/cancel", new { }, token);
        reCancel.Should().BeFalse();
        reCancelStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Booking_CanOnlyBeEditedWhileDraft()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("bk-edit");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (editSuccess, _, _) = await PutAsync($"/api/v1/sales/bookings/{bookingId}", new
        {
            salesAgentUserId = Guid.Parse(agentId),
            bookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            totalPrice = 1_200_000m,
            discount = 0m,
            notes = "Updated while draft"
        }, token);
        editSuccess.Should().BeTrue();

        await PostAsync($"/api/v1/sales/bookings/{bookingId}/submit", new { }, token);

        var (blockedEdit, _, blockedStatus) = await PutAsync($"/api/v1/sales/bookings/{bookingId}", new
        {
            salesAgentUserId = Guid.Parse(agentId),
            bookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            totalPrice = 1_300_000m,
            discount = 0m,
            notes = "Should not apply"
        }, token);
        blockedEdit.Should().BeFalse();
        blockedStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PaymentPlan_AutoGeneratedSchedule_ReconcilesWithNetPrice()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pp-auto");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 1_000_000m, 100_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (success, body, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Standard 3-installment plan",
            bookingAmount = 50_000m,
            downPayment = 150_000m,
            planType = 1, // FixedAmount
            frequency = 0, // Monthly
            numberOfInstallments = 3,
            gracePeriodDays = 5,
            customSchedule = (object?)null
        }, token);

        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("totalScheduled").GetDecimal().Should().Be(900_000m); // NetPrice
        var installments = body.GetProperty("data").GetProperty("installments").EnumerateArray().ToList();
        installments.Should().HaveCount(5); // booking amount + down payment + 3 periodic
        installments.Sum(i => i.GetProperty("amount").GetDecimal()).Should().Be(900_000m);
        installments[0].GetProperty("label").GetString().Should().Be("Booking Amount");
        installments[1].GetProperty("label").GetString().Should().Be("Down Payment");
        installments.Select(i => i.GetProperty("installmentNumber").GetInt32()).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task PaymentPlan_CustomPercentageSchedule_MustSumTo100()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pp-pct");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 1_000_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var badSchedule = new
        {
            name = "Bad plan",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 0, // Percentage
            frequency = 0,
            numberOfInstallments = 2,
            gracePeriodDays = 0,
            customSchedule = new[]
            {
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)), value = 40m },
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(2)), value = 40m }
            }
        };
        var (badSuccess, _, badStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", badSchedule, token);
        badSuccess.Should().BeFalse();
        badStatus.Should().Be(HttpStatusCode.BadRequest);

        var goodSchedule = new
        {
            name = "Good plan",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 0,
            frequency = 0,
            numberOfInstallments = 2,
            gracePeriodDays = 0,
            customSchedule = new[]
            {
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)), value = 60m },
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(2)), value = 40m }
            }
        };
        var (goodSuccess, goodBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", goodSchedule, token);
        goodSuccess.Should().BeTrue();
        goodBody.GetProperty("data").GetProperty("totalScheduled").GetDecimal().Should().Be(1_000_000m);
    }

    [Fact]
    public async Task PaymentPlan_CustomFixedSchedule_MustReconcileWithRemainingBalance()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pp-fixed");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 500_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var mismatched = new
        {
            name = "Mismatched",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 1, // FixedAmount
            frequency = 0,
            numberOfInstallments = 2,
            gracePeriodDays = 0,
            customSchedule = new[]
            {
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)), value = 100_000m },
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(2)), value = 100_000m }
            }
        };
        var (mismatchSuccess, _, mismatchStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", mismatched, token);
        mismatchSuccess.Should().BeFalse();
        mismatchStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PaymentPlan_CannotBeCreatedTwiceForTheSameBooking()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pp-dupe");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        object Plan() => new
        {
            name = "Plan",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 1,
            frequency = 0,
            numberOfInstallments = 2,
            gracePeriodDays = 0,
            customSchedule = (object?)null
        };

        var (first, _, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", Plan(), token);
        first.Should().BeTrue();

        var (second, _, secondStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", Plan(), token);
        second.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Payment_PartialPayments_AccumulateAndUpdateInstallmentStatus()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pay-partial");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 200_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, planBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Plan",
            bookingAmount = 200_000m,
            downPayment = 0m,
            planType = 1,
            frequency = 0,
            numberOfInstallments = 1,
            gracePeriodDays = 0,
            customSchedule = (object?)null
        }, token);
        var installmentId = planBody.GetProperty("data").GetProperty("installments")[0].GetProperty("id").GetString()!;

        var (pay1Success, pay1Body, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId),
            amount = 80_000m,
            paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0,
            referenceNumber = (string?)null,
            notes = (string?)null
        }, token);
        pay1Success.Should().BeTrue();
        pay1Body.GetProperty("data").GetProperty("receiptNumber").GetString().Should().StartWith("RCPT-");

        var (planAfter1, planAfter1Body, _) = await GetAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", token);
        planAfter1.Should().BeTrue();
        var installmentAfter1 = planAfter1Body.GetProperty("data").GetProperty("installments")[0];
        installmentAfter1.GetProperty("status").GetInt32().Should().Be(1); // PartiallyPaid
        installmentAfter1.GetProperty("remainingAmount").GetDecimal().Should().Be(120_000m);

        var (pay2Success, _, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId),
            amount = 120_000m,
            paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 1,
            referenceNumber = "TXN-1",
            notes = (string?)null
        }, token);
        pay2Success.Should().BeTrue();

        var (planAfter2, planAfter2Body, _) = await GetAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", token);
        planAfter2.Should().BeTrue();
        var installmentAfter2 = planAfter2Body.GetProperty("data").GetProperty("installments")[0];
        installmentAfter2.GetProperty("status").GetInt32().Should().Be(2); // Paid
        installmentAfter2.GetProperty("remainingAmount").GetDecimal().Should().Be(0m);

        var (paymentsSuccess, paymentsBody, _) = await GetAsync($"/api/v1/sales/bookings/{bookingId}/payments", token);
        paymentsSuccess.Should().BeTrue();
        paymentsBody.GetProperty("data").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task Payment_OverpaymentIsRejected()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pay-over");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 100_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, planBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Plan",
            bookingAmount = 100_000m,
            downPayment = 0m,
            planType = 1,
            frequency = 0,
            numberOfInstallments = 1,
            gracePeriodDays = 0,
            customSchedule = (object?)null
        }, token);
        var installmentId = planBody.GetProperty("data").GetProperty("installments")[0].GetProperty("id").GetString()!;

        var (overpaySuccess, _, overpayStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId),
            amount = 150_000m,
            paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0,
            referenceNumber = (string?)null,
            notes = (string?)null
        }, token);
        overpaySuccess.Should().BeFalse();
        overpayStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Payment_CannotBeRecordedAgainstAlreadyPaidOrCancelledInstallment()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pay-blocked");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 50_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, planBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Plan",
            bookingAmount = 50_000m,
            downPayment = 0m,
            planType = 1,
            frequency = 0,
            numberOfInstallments = 1,
            gracePeriodDays = 0,
            customSchedule = (object?)null
        }, token);
        var installmentId = planBody.GetProperty("data").GetProperty("installments")[0].GetProperty("id").GetString()!;

        object Payment() => new
        {
            installmentId = Guid.Parse(installmentId),
            amount = 50_000m,
            paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0,
            referenceNumber = (string?)null,
            notes = (string?)null
        };

        var (firstSuccess, _, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", Payment(), token);
        firstSuccess.Should().BeTrue();

        var (secondSuccess, _, secondStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", Payment(), token);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Overdue_IsComputedFromDueDateAndGracePeriod()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("pp-overdue");
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId, 100_000m), token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (success, body, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Overdue plan",
            bookingAmount = 0m,
            downPayment = 0m,
            planType = 1,
            frequency = 0,
            numberOfInstallments = 1,
            gracePeriodDays = 0,
            customSchedule = new[]
            {
                new { dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)), value = 100_000m }
            }
        }, token);
        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("installments")[0].GetProperty("status").GetInt32().Should().Be(3); // Overdue
    }

    [Fact]
    public async Task SalesDashboard_IsTenantScoped()
    {
        var (tokenA, customerIdA, projectIdA, unitIdA, agentIdA) = await SetupBookingContextAsync("dash-a");
        var (tokenB, _, _, _, _) = await SetupBookingContextAsync("dash-b");

        await PostAsync("/api/v1/sales/bookings", BookingPayload(customerIdA, projectIdA, unitIdA, agentIdA, 300_000m), tokenA);

        var (successA, bodyA, _) = await GetAsync("/api/v1/sales/dashboard", tokenA);
        successA.Should().BeTrue();
        bodyA.GetProperty("data").GetProperty("totalBookings").GetInt32().Should().Be(1);
        bodyA.GetProperty("data").GetProperty("totalBookingValue").GetDecimal().Should().Be(300_000m);

        var (successB, bodyB, _) = await GetAsync("/api/v1/sales/dashboard", tokenB);
        successB.Should().BeTrue();
        bodyB.GetProperty("data").GetProperty("totalBookings").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task Bookings_AreIsolatedPerTenant()
    {
        var (tokenA, customerIdA, projectIdA, unitIdA, agentIdA) = await SetupBookingContextAsync("iso-a");
        var (tokenB, _, _, _, _) = await SetupBookingContextAsync("iso-b");

        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerIdA, projectIdA, unitIdA, agentIdA), tokenA);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (bListSuccess, bListBody, _) = await GetAsync("/api/v1/sales/bookings", tokenB);
        bListSuccess.Should().BeTrue();
        bListBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(0);

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/sales/bookings/{bookingId}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SalesAgent_CannotApproveBooking_ButSalesManagerCan()
    {
        var (ownerToken, customerId, projectId, unitId, _) = await SetupBookingContextAsync("rbac-approve");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var agentEmail = $"agent-{suffix}@rbac-approve.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var managerEmail = $"manager-{suffix}@rbac-approve.test";
        await PostAsync("/api/v1/users", new { email = managerEmail, fullName = "Manager", password = "Manager@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Manager" } }, ownerToken);
        var managerToken = await LoginAsync(managerEmail, "Manager@12345");

        var (createSuccess, bookingBody, createStatus) = await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, await GetOwnUserIdAsync(ownerToken)), agentToken);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        await PostAsync($"/api/v1/sales/bookings/{bookingId}/submit", new { }, agentToken);

        var (agentApprove, _, agentApproveStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/approve", new { }, agentToken);
        agentApprove.Should().BeFalse();
        agentApproveStatus.Should().Be(HttpStatusCode.Forbidden);

        var (managerApprove, managerApproveBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/approve", new { }, managerToken);
        managerApprove.Should().BeTrue();
        managerApproveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Confirmed
    }

    [Fact]
    public async Task AuditLog_RecordsSalesModuleActions()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupBookingContextAsync("audit-sales");
        await PostAsync("/api/v1/sales/bookings", BookingPayload(customerId, projectId, unitId, agentId), token);

        var (success, body, _) = await GetAsync("/api/v1/audit-logs?module=Sales", token);
        success.Should().BeTrue();
        body.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
        var firstEntry = body.GetProperty("data")[0];
        firstEntry.GetProperty("module").GetString().Should().Be("Sales");
    }
}
