using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class FinanceTests : TestBase
{
    public FinanceTests(CustomWebApplicationFactory factory) : base(factory) { }

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

    private async Task<string> GetOwnUserIdAsync(string token)
    {
        var (_, body, _) = await GetAsync("/api/v1/users", token);
        return body.GetProperty("data")[0].GetProperty("id").GetString()!;
    }

    /// <summary>Sets up a confirmed booking with a single-installment payment plan, ready to accept a payment. Returns (token, bookingId, installmentId).</summary>
    private async Task<(string Token, string BookingId, string InstallmentId)> SetupPayableBookingAsync(string prefix, decimal amount = 100_000m)
    {
        var (token, _, _) = await CreateOrganizationAsync(prefix);
        var customerId = await CreateCustomerAsync(token, $"{prefix} Customer");
        var codeBase = prefix.ToUpperInvariant().Replace("-", "");
        var projectId = await CreateProjectAsync(token, codeBase[..Math.Min(8, codeBase.Length)]);
        var unitId = await CreateInventoryUnitAsync(token, projectId, "UNIT-1");
        var agentId = await GetOwnUserIdAsync(token);

        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", new
        {
            customerId = Guid.Parse(customerId), projectId = Guid.Parse(projectId), inventoryUnitId = Guid.Parse(unitId),
            salesAgentUserId = Guid.Parse(agentId), bookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            totalPrice = amount, discount = 0m, notes = (string?)null
        }, token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, planBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Plan", bookingAmount = amount, downPayment = 0m, planType = 1, frequency = 0,
            numberOfInstallments = 1, gracePeriodDays = 0, customSchedule = (object?)null
        }, token);
        var installmentId = planBody.GetProperty("data").GetProperty("installments")[0].GetProperty("id").GetString()!;

        return (token, bookingId, installmentId);
    }

    [Fact]
    public async Task ChartOfAccounts_SeedsSystemAccountsAndSupportsCrud()
    {
        var (token, _, _) = await CreateOrganizationAsync("coa-crud");

        var (listSuccess, listBody, _) = await GetAsync("/api/v1/finance/accounts", token);
        listSuccess.Should().BeTrue();
        listBody.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(2); // Cash + Revenue system accounts

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/finance/accounts", new
        {
            code = "5000", name = "Office Expenses", type = 4, parentAccountId = (Guid?)null
        }, token);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var accountId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/finance/accounts/{accountId}", new
        {
            name = "Office Expenses (Renamed)", parentAccountId = (Guid?)null, isActive = true
        }, token);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("name").GetString().Should().Be("Office Expenses (Renamed)");

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/finance/accounts/{accountId}", token);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Account_CodeMustBeUniquePerTenant()
    {
        var (token, _, _) = await CreateOrganizationAsync("coa-dupe");

        var (firstSuccess, _, _) = await PostAsync("/api/v1/finance/accounts", new { code = "5100", name = "A", type = 4, parentAccountId = (Guid?)null }, token);
        firstSuccess.Should().BeTrue();

        var (secondSuccess, _, secondStatus) = await PostAsync("/api/v1/finance/accounts", new { code = "5100", name = "B", type = 4, parentAccountId = (Guid?)null }, token);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Account_HierarchyCanBeCreated_ButCircularHierarchyIsRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("coa-hierarchy");

        var (_, parentBody, _) = await PostAsync("/api/v1/finance/accounts", new { code = "2000", name = "Liabilities", type = 1, parentAccountId = (Guid?)null }, token);
        var parentId = parentBody.GetProperty("data").GetProperty("id").GetString()!;

        var (childSuccess, childBody, _) = await PostAsync("/api/v1/finance/accounts", new { code = "2100", name = "Loans Payable", type = 1, parentAccountId = Guid.Parse(parentId) }, token);
        childSuccess.Should().BeTrue();
        var childId = childBody.GetProperty("data").GetProperty("id").GetString()!;
        childBody.GetProperty("data").GetProperty("parentAccountName").GetString().Should().Be("Liabilities");

        // Making the parent a child of its own child would create a cycle.
        var (cycleSuccess, _, cycleStatus) = await PutAsync($"/api/v1/finance/accounts/{parentId}", new
        {
            name = "Liabilities", parentAccountId = Guid.Parse(childId), isActive = true
        }, token);
        cycleSuccess.Should().BeFalse();
        cycleStatus.Should().Be(HttpStatusCode.BadRequest);

        // Self-parenting is also rejected.
        var (selfSuccess, _, selfStatus) = await PutAsync($"/api/v1/finance/accounts/{parentId}", new
        {
            name = "Liabilities", parentAccountId = Guid.Parse(parentId), isActive = true
        }, token);
        selfSuccess.Should().BeFalse();
        selfStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SystemAccounts_CannotBeDeleted()
    {
        var (token, _, _) = await CreateOrganizationAsync("coa-system");
        var (_, listBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", token);
        var cashAccount = listBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "1000");
        cashAccount.GetProperty("isSystem").GetBoolean().Should().BeTrue();

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/finance/accounts/{cashAccount.GetProperty("id").GetString()}", token);
        deleteSuccess.Should().BeFalse();
        deleteStatus.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task JournalEntry_BalancedEntryIsAcceptedAndUnbalancedIsRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("je-balance");
        var (_, accountsBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", token);
        var cashId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "1000").GetProperty("id").GetString();
        var revenueId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "4000").GetProperty("id").GetString();

        var (balancedSuccess, balancedBody, balancedStatus) = await PostAsync("/api/v1/finance/journal-entries", new
        {
            entryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            description = "Manual balanced entry",
            lines = new[]
            {
                new { accountId = Guid.Parse(cashId!), debit = 1000m, credit = 0m, description = (string?)null },
                new { accountId = Guid.Parse(revenueId!), debit = 0m, credit = 1000m, description = (string?)null }
            }
        }, token);
        balancedSuccess.Should().BeTrue();
        balancedStatus.Should().Be(HttpStatusCode.Created);
        balancedBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Draft
        balancedBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(1000m);

        var (unbalancedSuccess, _, unbalancedStatus) = await PostAsync("/api/v1/finance/journal-entries", new
        {
            entryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            description = "Manual unbalanced entry",
            lines = new[]
            {
                new { accountId = Guid.Parse(cashId!), debit = 1000m, credit = 0m, description = (string?)null },
                new { accountId = Guid.Parse(revenueId!), debit = 0m, credit = 900m, description = (string?)null }
            }
        }, token);
        unbalancedSuccess.Should().BeFalse();
        unbalancedStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task JournalEntry_PostedEntryIsImmutable()
    {
        var (token, _, _) = await CreateOrganizationAsync("je-immutable");
        var (_, accountsBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", token);
        var cashId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "1000").GetProperty("id").GetString();
        var revenueId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "4000").GetProperty("id").GetString();

        var (_, entryBody, _) = await PostAsync("/api/v1/finance/journal-entries", new
        {
            entryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            description = "To be posted",
            lines = new[]
            {
                new { accountId = Guid.Parse(cashId!), debit = 500m, credit = 0m, description = (string?)null },
                new { accountId = Guid.Parse(revenueId!), debit = 0m, credit = 500m, description = (string?)null }
            }
        }, token);
        var entryId = entryBody.GetProperty("data").GetProperty("id").GetString()!;

        var (postSuccess, postBody, _) = await PostAsync($"/api/v1/finance/journal-entries/{entryId}/post", new { }, token);
        postSuccess.Should().BeTrue();
        postBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Posted

        var (rePostSuccess, _, rePostStatus) = await PostAsync($"/api/v1/finance/journal-entries/{entryId}/post", new { }, token);
        rePostSuccess.Should().BeFalse();
        rePostStatus.Should().Be(HttpStatusCode.BadRequest);

        var (cancelSuccess, _, cancelStatus) = await PostAsync($"/api/v1/finance/journal-entries/{entryId}/cancel", new { }, token);
        cancelSuccess.Should().BeFalse();
        cancelStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task JournalEntry_DraftCanBeCancelled()
    {
        var (token, _, _) = await CreateOrganizationAsync("je-cancel");
        var (_, accountsBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", token);
        var cashId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "1000").GetProperty("id").GetString();
        var revenueId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "4000").GetProperty("id").GetString();

        var (_, entryBody, _) = await PostAsync("/api/v1/finance/journal-entries", new
        {
            entryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            description = "To be cancelled",
            lines = new[]
            {
                new { accountId = Guid.Parse(cashId!), debit = 200m, credit = 0m, description = (string?)null },
                new { accountId = Guid.Parse(revenueId!), debit = 0m, credit = 200m, description = (string?)null }
            }
        }, token);
        var entryId = entryBody.GetProperty("data").GetProperty("id").GetString()!;

        var (cancelSuccess, cancelBody, _) = await PostAsync($"/api/v1/finance/journal-entries/{entryId}/cancel", new { }, token);
        cancelSuccess.Should().BeTrue();
        cancelBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Cancelled
    }

    [Fact]
    public async Task SalesPayment_AutomaticallyPostsJournalEntryAndReceiptDocument()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fin-sales-post", 250_000m);

        var (paySuccess, payBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 250_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        paySuccess.Should().BeTrue();
        var journalEntryId = payBody.GetProperty("data").GetProperty("journalEntryId").GetString();
        journalEntryId.Should().NotBeNull();

        var (getSuccess, getBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{journalEntryId}", token);
        getSuccess.Should().BeTrue();
        getBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Posted immediately
        getBody.GetProperty("data").GetProperty("referenceType").GetString().Should().Be("SalesPayment");
        getBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(250_000m);
        getBody.GetProperty("data").GetProperty("totalCredit").GetDecimal().Should().Be(250_000m);
        getBody.GetProperty("data").GetProperty("lines").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task Overpayment_IsRejectedAndCreatesNoJournalEntry()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fin-overpay", 100_000m);

        var (_, beforeBody, _) = await GetAsync("/api/v1/finance/journal-entries", token);
        var countBefore = beforeBody.GetProperty("meta").GetProperty("total").GetInt32();

        var (overpaySuccess, _, overpayStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 999_999m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        overpaySuccess.Should().BeFalse();
        overpayStatus.Should().Be(HttpStatusCode.BadRequest);

        var (_, afterBody, _) = await GetAsync("/api/v1/finance/journal-entries", token);
        afterBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(countBefore);
    }

    [Fact]
    public async Task DuplicatePaymentRequest_WithSameIdempotencyKey_DoesNotCreateDuplicateJournalEntry()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fin-idem", 80_000m);
        var idempotencyKey = Guid.NewGuid().ToString();

        object Payload() => new
        {
            installmentId = Guid.Parse(installmentId), amount = 80_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null, idempotencyKey
        };

        var (firstSuccess, firstBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", Payload(), token);
        firstSuccess.Should().BeTrue();
        var firstPaymentId = firstBody.GetProperty("data").GetProperty("id").GetString();

        var (secondSuccess, secondBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", Payload(), token);
        secondSuccess.Should().BeTrue();
        secondBody.GetProperty("data").GetProperty("id").GetString().Should().Be(firstPaymentId);

        var (_, paymentsBody, _) = await GetAsync($"/api/v1/sales/bookings/{bookingId}/payments", token);
        paymentsBody.GetProperty("data").GetArrayLength().Should().Be(1);

        var (_, journalBody, _) = await GetAsync("/api/v1/finance/journal-entries?referenceType=SalesPayment", token);
        journalBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Receivables_ReflectInstallmentOutstandingAmounts()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fin-receivable", 60_000m);

        var (beforeSuccess, beforeBody, _) = await GetAsync("/api/v1/finance/receivables", token);
        beforeSuccess.Should().BeTrue();
        var receivable = beforeBody.GetProperty("data").EnumerateArray().First(r => r.GetProperty("bookingId").GetString() == bookingId);
        receivable.GetProperty("outstandingAmount").GetDecimal().Should().Be(60_000m);

        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 20_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);

        var (afterSuccess, afterBody, _) = await GetAsync("/api/v1/finance/receivables", token);
        afterSuccess.Should().BeTrue();
        var updated = afterBody.GetProperty("data").EnumerateArray().First(r => r.GetProperty("bookingId").GetString() == bookingId);
        updated.GetProperty("outstandingAmount").GetDecimal().Should().Be(40_000m);
        updated.GetProperty("status").GetInt32().Should().Be(1); // PartiallyPaid
    }

    [Fact]
    public async Task FinanceDashboard_IsTenantScoped()
    {
        var (tokenA, bookingIdA, installmentIdA) = await SetupPayableBookingAsync("fin-dash-a", 500_000m);
        var (tokenB, _, _) = await SetupPayableBookingAsync("fin-dash-b", 300_000m);

        await PostAsync($"/api/v1/sales/bookings/{bookingIdA}/payments", new
        {
            installmentId = Guid.Parse(installmentIdA), amount = 500_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, tokenA);

        var (successA, bodyA, _) = await GetAsync("/api/v1/finance/dashboard", tokenA);
        successA.Should().BeTrue();
        bodyA.GetProperty("data").GetProperty("totalCollected").GetDecimal().Should().Be(500_000m);
        bodyA.GetProperty("data").GetProperty("totalRevenue").GetDecimal().Should().Be(500_000m);

        var (successB, bodyB, _) = await GetAsync("/api/v1/finance/dashboard", tokenB);
        successB.Should().BeTrue();
        bodyB.GetProperty("data").GetProperty("totalCollected").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task TrialBalance_Reconciles()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fin-trial-balance", 150_000m);
        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 150_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);

        var (success, body, _) = await GetAsync("/api/v1/finance/reports/trial-balance", token);
        success.Should().BeTrue();
        var totalDebit = body.GetProperty("data").GetProperty("totalDebit").GetDecimal();
        var totalCredit = body.GetProperty("data").GetProperty("totalCredit").GetDecimal();
        totalDebit.Should().Be(totalCredit);
        totalDebit.Should().Be(150_000m);
    }

    [Fact]
    public async Task Accounts_AndJournalEntries_AreIsolatedPerTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("fin-iso-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("fin-iso-b");

        var (_, createBody, _) = await PostAsync("/api/v1/finance/accounts", new { code = "9999", name = "Tenant A Only", type = 4, parentAccountId = (Guid?)null }, tokenA);
        var accountId = createBody.GetProperty("data").GetProperty("id").GetString();

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/finance/accounts/{accountId}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);

        var (_, bListBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", tokenB);
        bListBody.GetProperty("data").EnumerateArray().Any(a => a.GetProperty("code").GetString() == "9999").Should().BeFalse();
    }

    [Fact]
    public async Task SalesAgent_CannotManageFinance_ButAccountantCan()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("fin-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var agentEmail = $"agent-{suffix}@fin-rbac.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var accountantEmail = $"accountant-{suffix}@fin-rbac.test";
        await PostAsync("/api/v1/users", new { email = accountantEmail, fullName = "Accountant", password = "Accountant@12345", phoneNumber = (string?)null, roleNames = new[] { "Accountant" } }, ownerToken);
        var accountantToken = await LoginAsync(accountantEmail, "Accountant@12345");

        var (agentSuccess, _, agentStatus) = await PostAsync("/api/v1/finance/accounts", new { code = "6000", name = "Blocked", type = 4, parentAccountId = (Guid?)null }, agentToken);
        agentSuccess.Should().BeFalse();
        agentStatus.Should().Be(HttpStatusCode.Forbidden);

        var (accountantSuccess, _, accountantStatus) = await PostAsync("/api/v1/finance/accounts", new { code = "6000", name = "Allowed", type = 4, parentAccountId = (Guid?)null }, accountantToken);
        accountantSuccess.Should().BeTrue();
        accountantStatus.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task FiscalPeriod_ClosedPeriodRejectsBackdatedPostings_AndReopenRestoresIt()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fp-close", 50_000m);
        var lastMonthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1);

        var (createPeriodSuccess, periodBody, _) = await PostAsync("/api/v1/finance/fiscal-periods", new
        {
            name = "Last month", startDate = lastMonthDate.AddDays(-15), endDate = lastMonthDate.AddDays(15)
        }, token);
        createPeriodSuccess.Should().BeTrue();
        var periodId = periodBody.GetProperty("data").GetProperty("id").GetString()!;

        var (closeSuccess, closeBody, _) = await PostAsync($"/api/v1/finance/fiscal-periods/{periodId}/close", new { }, token);
        closeSuccess.Should().BeTrue();
        closeBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Closed

        var (paySuccess, _, payStatus) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 50_000m, paymentDate = lastMonthDate,
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        paySuccess.Should().BeFalse();
        payStatus.Should().Be(HttpStatusCode.BadRequest);

        var (reopenSuccess, reopenBody, _) = await PostAsync($"/api/v1/finance/fiscal-periods/{periodId}/reopen", new { }, token);
        reopenSuccess.Should().BeTrue();
        reopenBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Open

        var (retrySuccess, _, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 50_000m, paymentDate = lastMonthDate,
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        retrySuccess.Should().BeTrue();
    }

    [Fact]
    public async Task FiscalPeriod_DatesOutsideAnyDefinedPeriod_AreUnrestricted()
    {
        // No fiscal period is ever created for this tenant — posting must behave exactly as before this milestone.
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("fp-none", 30_000m);

        var (success, _, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 30_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        success.Should().BeTrue();
    }

    [Fact]
    public async Task FiscalPeriod_OverlappingPeriodIsRejected()
    {
        var (token, _, _) = await CreateOrganizationAsync("fp-overlap");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var (firstSuccess, _, _) = await PostAsync("/api/v1/finance/fiscal-periods", new { name = "Q1", startDate = today, endDate = today.AddDays(30) }, token);
        firstSuccess.Should().BeTrue();

        var (overlapSuccess, _, overlapStatus) = await PostAsync("/api/v1/finance/fiscal-periods", new
        {
            name = "Overlapping", startDate = today.AddDays(15), endDate = today.AddDays(45)
        }, token);
        overlapSuccess.Should().BeFalse();
        overlapStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task JournalEntry_ReversalSwapsDebitsAndCredits_AndCannotBeReversedTwice()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("je-reverse", 40_000m);
        var (_, payBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 40_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        var originalEntryId = payBody.GetProperty("data").GetProperty("journalEntryId").GetString()!;

        var (reverseSuccess, reverseBody, _) = await PostAsync($"/api/v1/finance/journal-entries/{originalEntryId}/reverse", new
        {
            reversalDate = (DateOnly?)null, reason = "Correcting a test entry"
        }, token);
        reverseSuccess.Should().BeTrue();
        var reversalLines = reverseBody.GetProperty("data").GetProperty("lines").EnumerateArray().ToList();
        reverseBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(40_000m);
        reverseBody.GetProperty("data").GetProperty("totalCredit").GetDecimal().Should().Be(40_000m);
        reverseBody.GetProperty("data").GetProperty("reversalOfEntryId").GetString().Should().Be(originalEntryId);

        var (_, originalAfterBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{originalEntryId}", token);
        originalAfterBody.GetProperty("data").GetProperty("isReversed").GetBoolean().Should().BeTrue();
        var originalLines = originalAfterBody.GetProperty("data").GetProperty("lines").EnumerateArray().ToList();
        foreach (var originalLine in originalLines)
        {
            var swapped = reversalLines.First(l => l.GetProperty("accountId").GetString() == originalLine.GetProperty("accountId").GetString());
            swapped.GetProperty("debit").GetDecimal().Should().Be(originalLine.GetProperty("credit").GetDecimal());
            swapped.GetProperty("credit").GetDecimal().Should().Be(originalLine.GetProperty("debit").GetDecimal());
        }

        var (secondReverseSuccess, _, secondReverseStatus) = await PostAsync($"/api/v1/finance/journal-entries/{originalEntryId}/reverse", new
        {
            reversalDate = (DateOnly?)null, reason = (string?)null
        }, token);
        secondReverseSuccess.Should().BeFalse();
        secondReverseStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task JournalEntry_DraftEntryCannotBeReversed()
    {
        var (token, _, _) = await CreateOrganizationAsync("je-reverse-draft");
        var (_, accountsBody, _) = await GetAsync("/api/v1/finance/accounts?pageSize=50", token);
        var cashId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "1000").GetProperty("id").GetString();
        var revenueId = accountsBody.GetProperty("data").EnumerateArray().First(a => a.GetProperty("code").GetString() == "4000").GetProperty("id").GetString();

        var (_, entryBody, _) = await PostAsync("/api/v1/finance/journal-entries", new
        {
            entryDate = DateOnly.FromDateTime(DateTime.UtcNow), description = "Still draft",
            lines = new[]
            {
                new { accountId = Guid.Parse(cashId!), debit = 100m, credit = 0m, description = (string?)null },
                new { accountId = Guid.Parse(revenueId!), debit = 0m, credit = 100m, description = (string?)null }
            }
        }, token);
        var entryId = entryBody.GetProperty("data").GetProperty("id").GetString()!;

        var (reverseSuccess, _, reverseStatus) = await PostAsync($"/api/v1/finance/journal-entries/{entryId}/reverse", new { reversalDate = (DateOnly?)null, reason = (string?)null }, token);
        reverseSuccess.Should().BeFalse();
        reverseStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BalanceSheet_AssetsEqualLiabilitiesPlusEquityPlusNetIncome()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("bs-reconcile", 120_000m);
        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 120_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);

        var (success, body, _) = await GetAsync("/api/v1/finance/reports/balance-sheet", token);
        success.Should().BeTrue();
        var data = body.GetProperty("data");
        data.GetProperty("totalAssets").GetDecimal().Should().Be(120_000m);
        data.GetProperty("netIncome").GetDecimal().Should().Be(120_000m);
        data.GetProperty("totalAssets").GetDecimal().Should().Be(data.GetProperty("totalLiabilitiesAndEquity").GetDecimal());
    }

    [Fact]
    public async Task ProfitAndLoss_BreaksDownRevenueAndExpenseByAccount()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("pnl-lines", 75_000m);
        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 75_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);

        var (success, body, _) = await GetAsync("/api/v1/finance/reports/profit-and-loss", token);
        success.Should().BeTrue();
        var data = body.GetProperty("data");
        data.GetProperty("totalRevenue").GetDecimal().Should().Be(75_000m);
        data.GetProperty("netIncome").GetDecimal().Should().Be(75_000m);
        data.GetProperty("revenueLines").EnumerateArray().Should().Contain(l => l.GetProperty("code").GetString() == "4000");
    }

    [Fact]
    public async Task CashFlow_OpeningPlusNetChangeEqualsClosingCash()
    {
        var (token, bookingId, installmentId) = await SetupPayableBookingAsync("cf-reconcile", 90_000m);
        await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount = 90_000m, paymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token);

        var (success, body, _) = await GetAsync("/api/v1/finance/reports/cash-flow", token);
        success.Should().BeTrue();
        var data = body.GetProperty("data");
        data.GetProperty("totalInflows").GetDecimal().Should().Be(90_000m);
        data.GetProperty("closingCash").GetDecimal().Should().Be(data.GetProperty("openingCash").GetDecimal() + data.GetProperty("netChange").GetDecimal());
        data.GetProperty("closingCash").GetDecimal().Should().Be(90_000m);
    }

    [Fact]
    public async Task AuditLog_RecordsFinanceModuleActions()
    {
        var (token, _, _) = await CreateOrganizationAsync("fin-audit");
        await PostAsync("/api/v1/finance/accounts", new { code = "7000", name = "Audited Account", type = 4, parentAccountId = (Guid?)null }, token);

        var (success, body, _) = await GetAsync("/api/v1/audit-logs?module=Finance", token);
        success.Should().BeTrue();
        body.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
        body.GetProperty("data")[0].GetProperty("module").GetString().Should().Be("Finance");
    }
}
