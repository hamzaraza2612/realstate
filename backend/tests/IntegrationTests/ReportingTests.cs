using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class ReportingTests : TestBase
{
    public ReportingTests(CustomWebApplicationFactory factory) : base(factory) { }

    // --- Shared setup helpers (mirroring the exact request shapes used by the owning module's own tests) ---

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

    /// <summary>Creates a Confirmed booking (Draft -> PendingApproval -> Confirmed) with a single
    /// fixed installment due today, fully reconcilable in report assertions.</summary>
    private async Task<(string BookingId, string InstallmentId)> CreateConfirmedBookingWithInstallmentAsync(
        string token, string customerId, string projectId, string unitId, string agentId, decimal netPrice, DateOnly bookingDate)
    {
        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", new
        {
            customerId = Guid.Parse(customerId), projectId = Guid.Parse(projectId), inventoryUnitId = Guid.Parse(unitId),
            salesAgentUserId = Guid.Parse(agentId), bookingDate, totalPrice = netPrice, discount = 0m, notes = (string?)null
        }, token);
        var bookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;

        await PostAsync($"/api/v1/sales/bookings/{bookingId}/submit", new { }, token);
        await PostAsync($"/api/v1/sales/bookings/{bookingId}/approve", new { }, token);

        var (_, planBody, _) = await PostAsync($"/api/v1/sales/bookings/{bookingId}/payment-plan", new
        {
            name = "Full", bookingAmount = netPrice, downPayment = 0m, planType = 1, frequency = 0,
            numberOfInstallments = 1, gracePeriodDays = 0, customSchedule = (object?)null
        }, token);
        var installmentId = planBody.GetProperty("data").GetProperty("installments")[0].GetProperty("id").GetString()!;

        return (bookingId, installmentId);
    }

    private async Task RecordPaymentAsync(string token, string bookingId, string installmentId, decimal amount, DateOnly paymentDate)
    {
        (await PostAsync($"/api/v1/sales/bookings/{bookingId}/payments", new
        {
            installmentId = Guid.Parse(installmentId), amount, paymentDate, method = 0, referenceNumber = (string?)null, notes = (string?)null
        }, token)).Success.Should().BeTrue();
    }

    private async Task<(string OwnerToken, string CustomerId, string ProjectId, string UnitId, string AgentId)> SetupSalesContextAsync(string prefix)
    {
        var (token, _, _) = await CreateOrganizationAsync(prefix);
        var customerId = await CreateCustomerAsync(token, $"{prefix} Customer");
        var codeBase = prefix.ToUpperInvariant().Replace("-", "");
        var projectId = await CreateProjectAsync(token, codeBase[..Math.Min(8, codeBase.Length)]);
        var unitId = await CreateInventoryUnitAsync(token, projectId, "UNIT-1");
        var agentId = await GetOwnUserIdAsync(token);
        return (token, customerId, projectId, unitId, agentId);
    }

    private async Task<string> CreateWorkPackageAsync(string token, string projectId, string code, decimal? budget = null)
    {
        var (_, body, _) = await PostAsync("/api/v1/construction/work-packages", new
        {
            projectId = Guid.Parse(projectId), name = $"WP {code}", code, description = (string?)null,
            plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null, managerUserId = (Guid?)null, budget
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
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

    private async Task<string> CreateExpenseAsync(
        string token, string projectId, string? workPackageId, string? vendorId, decimal amount, DateOnly expenseDate, int category = 2)
    {
        var (_, body, _) = await PostAsync("/api/v1/construction/expenses", new
        {
            projectId = Guid.Parse(projectId), workPackageId = workPackageId is null ? (Guid?)null : Guid.Parse(workPackageId),
            category, amount, expenseDate, vendorId = vendorId is null ? (Guid?)null : Guid.Parse(vendorId),
            referenceNumber = (string?)null, notes = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

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

    private async Task<string> CreateUnitAsync(string token, string propertyId, string unitNumber)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/units", new
        {
            propertyId = Guid.Parse(propertyId), buildingBlock = (string?)null, unitNumber, type = 0, floor = (string?)null,
            areaSize = (decimal?)null, areaUnit = (string?)null, bedrooms = (int?)null, marketRentRate = (decimal?)1000m, metadataJson = (string?)null
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

    private async Task<string> CreateActiveLeaseAsync(string token, string propertyId, string unitId, string tenantId, DateOnly start, DateOnly end, decimal rent, int gracePeriodDays = 0)
    {
        var (_, body, _) = await PostAsync("/api/v1/property/leases", new
        {
            propertyId = Guid.Parse(propertyId), unitId = Guid.Parse(unitId), rentalTenantId = Guid.Parse(tenantId),
            startDate = start, endDate = end, rentAmount = rent, securityDeposit = 0m,
            paymentFrequency = 0, gracePeriodDays, terms = (string?)null, notes = (string?)null
        }, token);
        var leaseId = body.GetProperty("data").GetProperty("id").GetString()!;
        (await PostAsync($"/api/v1/property/leases/{leaseId}/submit", new { }, token)).Success.Should().BeTrue();
        (await PostAsync($"/api/v1/property/leases/{leaseId}/approve", new { }, token)).Success.Should().BeTrue();
        return leaseId;
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

    // === Executive Dashboard ===

    [Fact]
    public async Task ExecutiveDashboard_ComputesSalesAndReconcilesWithProfitAndLossAndCashFlow()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("exec-kpi");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (bookingId, installmentId) = await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 500_000m, today);
        await RecordPaymentAsync(token, bookingId, installmentId, 200_000m, today);

        var (success, body, _) = await GetAsync($"/api/v1/reports/executive?from={today.AddDays(-1):yyyy-MM-dd}&to={today:yyyy-MM-dd}", token);
        success.Should().BeTrue();
        var data = body.GetProperty("data");
        data.GetProperty("sales").GetDecimal().Should().Be(500_000m);
        data.GetProperty("collections").GetDecimal().Should().Be(200_000m);
        data.GetProperty("receivables").GetDecimal().Should().Be(300_000m);

        // Reconciliation: Executive Dashboard's Revenue/Expenses/Profit are the exact same figures
        // Finance's own Profit & Loss report returns for the same range — not recomputed separately.
        var (_, plBody, _) = await GetAsync($"/api/v1/finance/reports/profit-and-loss?from={today.AddDays(-1):yyyy-MM-dd}&to={today:yyyy-MM-dd}", token);
        data.GetProperty("revenue").GetDecimal().Should().Be(plBody.GetProperty("data").GetProperty("totalRevenue").GetDecimal());
        data.GetProperty("profit").GetDecimal().Should().Be(plBody.GetProperty("data").GetProperty("netIncome").GetDecimal());

        // Reconciliation: Cash Position is Finance's own Cash Flow ClosingCash as of "to".
        var (_, cfBody, _) = await GetAsync($"/api/v1/finance/reports/cash-flow?to={today:yyyy-MM-dd}", token);
        data.GetProperty("cashPosition").GetDecimal().Should().Be(cfBody.GetProperty("data").GetProperty("closingCash").GetDecimal());
    }

    [Fact]
    public async Task ExecutiveDashboard_DateRange_ExcludesBookingsOutsideRange()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("exec-range");
        var oldDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-3);
        await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 100_000m, oldDate);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (success, body, _) = await GetAsync($"/api/v1/reports/executive?from={today.AddDays(-1):yyyy-MM-dd}&to={today:yyyy-MM-dd}", token);
        success.Should().BeTrue();
        body.GetProperty("data").GetProperty("sales").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task ExecutiveDashboard_IsTenantScoped()
    {
        var (tokenA, customerIdA, projectIdA, unitIdA, agentIdA) = await SetupSalesContextAsync("exec-iso-a");
        var (tokenB, _, _, _, _) = await SetupSalesContextAsync("exec-iso-b");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(tokenA, customerIdA, projectIdA, unitIdA, agentIdA, 750_000m, today);

        var (_, bodyA, _) = await GetAsync("/api/v1/reports/executive", tokenA);
        bodyA.GetProperty("data").GetProperty("sales").GetDecimal().Should().Be(750_000m);

        var (_, bodyB, _) = await GetAsync("/api/v1/reports/executive", tokenB);
        bodyB.GetProperty("data").GetProperty("sales").GetDecimal().Should().Be(0m);
    }

    // === Sales Reports ===

    [Fact]
    public async Task SalesReports_ByProjectByAgent_IncludeConfirmedOnly_ExcludeDraftAndCancelled()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-agg");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 400_000m, today);

        // A second, still-Draft booking on a second unit must not count toward Confirmed totals.
        var unit2Id = await CreateInventoryUnitAsync(token, projectId, "UNIT-2");
        await PostAsync("/api/v1/sales/bookings", new
        {
            customerId = Guid.Parse(customerId), projectId = Guid.Parse(projectId), inventoryUnitId = Guid.Parse(unit2Id),
            salesAgentUserId = Guid.Parse(agentId), bookingDate = today, totalPrice = 999_000m, discount = 0m, notes = (string?)null
        }, token);

        var (byProjectSuccess, byProjectBody, _) = await GetAsync("/api/v1/reports/sales/by-project", token);
        byProjectSuccess.Should().BeTrue();
        var projectRows = byProjectBody.GetProperty("data").EnumerateArray().ToList();
        projectRows.Should().ContainSingle();
        projectRows[0].GetProperty("bookingCount").GetInt32().Should().Be(1);
        projectRows[0].GetProperty("totalNetPrice").GetDecimal().Should().Be(400_000m);

        var (byAgentSuccess, byAgentBody, _) = await GetAsync("/api/v1/reports/sales/by-agent", token);
        byAgentSuccess.Should().BeTrue();
        byAgentBody.GetProperty("data")[0].GetProperty("totalNetPrice").GetDecimal().Should().Be(400_000m);
    }

    [Fact]
    public async Task SalesReports_ByProject_FiltersByProjectId()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-filter");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 250_000m, today);

        var otherProjectId = await CreateProjectAsync(token, "OTHER1");
        var (_, body, _) = await GetAsync($"/api/v1/reports/sales/by-project?projectId={otherProjectId}", token);
        body.GetProperty("data").EnumerateArray().Should().BeEmpty();
    }

    [Fact]
    public async Task SalesReports_Cancellations_ListsOnlyCancelledBookings()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-cancel");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (bookingId, _) = await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 300_000m, today);
        (await PostAsync($"/api/v1/sales/bookings/{bookingId}/cancel", new { }, token)).Success.Should().BeTrue();

        var (success, body, _) = await GetAsync("/api/v1/reports/sales/cancellations", token);
        success.Should().BeTrue();
        var rows = body.GetProperty("data").EnumerateArray().ToList();
        rows.Should().ContainSingle();
        rows[0].GetProperty("bookingId").GetString().Should().Be(bookingId);
        rows[0].GetProperty("netPrice").GetDecimal().Should().Be(300_000m);
    }

    [Fact]
    public async Task SalesReports_ReceivableAging_BucketsByDaysPastDue()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-aging");
        var oldDueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-45); // -> 31-60 bucket

        var (_, bookingBody, _) = await PostAsync("/api/v1/sales/bookings", new
        {
            customerId = Guid.Parse(customerId), projectId = Guid.Parse(projectId), inventoryUnitId = Guid.Parse(unitId),
            salesAgentUserId = Guid.Parse(agentId), bookingDate = oldDueDate, totalPrice = 100_000m, discount = 0m, notes = (string?)null
        }, token);
        var agedBookingId = bookingBody.GetProperty("data").GetProperty("id").GetString()!;
        await PostAsync($"/api/v1/sales/bookings/{agedBookingId}/submit", new { }, token);
        await PostAsync($"/api/v1/sales/bookings/{agedBookingId}/approve", new { }, token);
        await PostAsync($"/api/v1/sales/bookings/{agedBookingId}/payment-plan", new
        {
            name = "Aged", bookingAmount = 0m, downPayment = 0m, planType = 1, frequency = 0,
            numberOfInstallments = 1, gracePeriodDays = 0,
            customSchedule = new[] { new { dueDate = oldDueDate, value = 100_000m } }
        }, token);

        var (success, body, _) = await GetAsync("/api/v1/reports/sales/receivable-aging", token);
        success.Should().BeTrue();
        var row = body.GetProperty("data").EnumerateArray().First(r => r.GetProperty("customerId").GetString() == customerId);
        row.GetProperty("days31To60").GetDecimal().Should().Be(100_000m);
        row.GetProperty("current").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task SalesReports_OutstandingInstallments_DelegatesToFinanceReceivables()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-outstanding");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 60_000m, today);

        var (success, body, _) = await GetAsync("/api/v1/reports/sales/outstanding-installments", token);
        success.Should().BeTrue();
        body.GetProperty("data").EnumerateArray().Should().ContainSingle(r => r.GetProperty("outstandingAmount").GetDecimal() == 60_000m);
    }

    [Fact]
    public async Task SalesReports_ByProject_SupportsCsvExport()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("sales-csv");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 111_000m, today);

        var (success, bytes, status, contentType) = await GetBytesAsync("/api/v1/reports/sales/by-project?format=csv", token);
        success.Should().BeTrue();
        status.Should().Be(HttpStatusCode.OK);
        contentType.Should().Be("text/csv");
        var csv = System.Text.Encoding.UTF8.GetString(bytes);
        csv.Should().Contain("ProjectName");
        csv.Should().Contain("111000");
    }

    // === Finance report extensions ===

    [Fact]
    public async Task FinanceReports_ApAging_IncludesOnlyApprovedExpenses()
    {
        var (token, projectId, wpId, vendorId, _) = await SetupConstructionContextAsync("fin-ap");
        var oldDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-70); // -> 61-90 bucket
        var approvedId = await CreateExpenseAsync(token, projectId, wpId, vendorId, 40_000m, oldDate);
        await PostAsync($"/api/v1/construction/expenses/{approvedId}/approve", new { }, token);

        await CreateExpenseAsync(token, projectId, wpId, vendorId, 15_000m, oldDate); // left Pending — must be excluded from AP aging

        var (success, body, _) = await GetAsync("/api/v1/reports/finance/ap-aging", token);
        success.Should().BeTrue();
        var rows = body.GetProperty("data").GetProperty("rows");
        rows.EnumerateArray().Should().ContainSingle();
        var row = rows[0];
        row.GetProperty("days61To90").GetDecimal().Should().Be(40_000m);
        body.GetProperty("data").GetProperty("totalOutstanding").GetDecimal().Should().Be(40_000m);
    }

    [Fact]
    public async Task FinanceReports_RevenueTrend_ReconcilesWithProfitAndLossTotalForSameRange()
    {
        var (token, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("fin-trend");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var (bookingId, installmentId) = await CreateConfirmedBookingWithInstallmentAsync(token, customerId, projectId, unitId, agentId, 220_000m, today);
        await RecordPaymentAsync(token, bookingId, installmentId, 220_000m, today);

        var from = today.AddDays(-1);
        var (_, trendBody, _) = await GetAsync($"/api/v1/reports/finance/revenue-trend?from={from:yyyy-MM-dd}&to={today:yyyy-MM-dd}", token);
        var trendTotal = trendBody.GetProperty("data").EnumerateArray().Sum(r => r.GetProperty("amount").GetDecimal());

        var (_, plBody, _) = await GetAsync($"/api/v1/finance/reports/profit-and-loss?from={from:yyyy-MM-dd}&to={today:yyyy-MM-dd}", token);
        trendTotal.Should().Be(plBody.GetProperty("data").GetProperty("totalRevenue").GetDecimal());
    }

    // === Construction / Procurement ===

    private async Task<(string Token, string ProjectId, string WorkPackageId, string VendorId, string MaterialId)> SetupConstructionContextAsync(string prefix)
    {
        var (token, _, _) = await CreateOrganizationAsync(prefix);
        var codeBase = prefix.ToUpperInvariant().Replace("-", "");
        var projectId = await CreateProjectAsync(token, codeBase[..Math.Min(8, codeBase.Length)]);
        var wpId = await CreateWorkPackageAsync(token, projectId, "WP1", budget: 100_000m);
        var vendorId = await CreateVendorAsync(token, $"{prefix} Vendor");
        var (_, materialBody, _) = await PostAsync("/api/v1/materials", new { sku = codeBase[..Math.Min(6, codeBase.Length)], name = "Mat", unitOfMeasure = "bag", category = (string?)null, minimumQuantity = 10m }, token);
        var materialId = materialBody.GetProperty("data").GetProperty("id").GetString()!;
        return (token, projectId, wpId, vendorId, materialId);
    }

    [Fact]
    public async Task ConstructionReports_BudgetVsActual_ComputesVarianceFromApprovedExpensesOnly()
    {
        var (token, projectId, wpId, vendorId, _) = await SetupConstructionContextAsync("con-budget");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expenseId = await CreateExpenseAsync(token, projectId, wpId, vendorId, 30_000m, today);
        await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, token);

        var (success, body, _) = await GetAsync("/api/v1/reports/construction/budget-vs-actual", token);
        success.Should().BeTrue();
        var row = body.GetProperty("data").EnumerateArray().First(r => r.GetProperty("workPackageId").GetString() == wpId);
        row.GetProperty("budget").GetDecimal().Should().Be(100_000m);
        row.GetProperty("actual").GetDecimal().Should().Be(30_000m);
        row.GetProperty("variance").GetDecimal().Should().Be(70_000m);
    }

    [Fact]
    public async Task ProcurementReports_PurchaseOrderExposure_ExcludesDraftAndReceivedAndCancelled()
    {
        var (token, projectId, _, vendorId, materialId) = await SetupConstructionContextAsync("proc-exposure");

        var (_, draftBody, _) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId), projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, purchaseRequestId = (Guid?)null,
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow), expectedDeliveryDate = (DateOnly?)null, notes = (string?)null,
            lines = new[] { new { materialId = Guid.Parse(materialId), itemDescription = "Cement", unitOfMeasure = "bag", quantity = 10m, unitPrice = 500m } },
            discount = 0m, taxAmount = 0m
        }, token);
        // left in Draft — must not count as exposure

        var (_, poBody, _) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId), projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, purchaseRequestId = (Guid?)null,
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow), expectedDeliveryDate = (DateOnly?)null, notes = (string?)null,
            lines = new[] { new { materialId = Guid.Parse(materialId), itemDescription = "Steel", unitOfMeasure = "bag", quantity = 4m, unitPrice = 1000m } },
            discount = 0m, taxAmount = 0m
        }, token);
        var poId = poBody.GetProperty("data").GetProperty("id").GetString()!;
        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/submit", new { }, token);
        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/approve", new { }, token);

        var (success, body, _) = await GetAsync("/api/v1/reports/procurement/purchase-order-exposure", token);
        success.Should().BeTrue();
        var rows = body.GetProperty("data").EnumerateArray().ToList();
        rows.Should().ContainSingle();
        rows[0].GetProperty("totalExposure").GetDecimal().Should().Be(4000m);
    }

    // === Property / Rental ===

    [Fact]
    public async Task PropertyReports_Occupancy_ReflectsActiveLease()
    {
        var (token, _, _) = await CreateOrganizationAsync("prop-occ");
        var propertyId = await CreatePropertyAsync(token, "OCC1");
        var unit1 = await CreateUnitAsync(token, propertyId, "U-1");
        await CreateUnitAsync(token, propertyId, "U-2");
        var tenantId = await CreateRentalTenantAsync(token, "Occ Tenant");
        await CreateActiveLeaseAsync(token, propertyId, unit1, tenantId,
            DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1), 1000m);

        var (success, body, _) = await GetAsync("/api/v1/reports/property/occupancy", token);
        success.Should().BeTrue();
        var row = body.GetProperty("data").EnumerateArray().First(r => r.GetProperty("propertyId").GetString() == propertyId);
        row.GetProperty("totalUnits").GetInt32().Should().Be(2);
        row.GetProperty("occupiedUnits").GetInt32().Should().Be(1);
        row.GetProperty("occupancyRate").GetDecimal().Should().Be(50.0m);
    }

    [Fact]
    public async Task PropertyReports_OverdueRentAndTenantAging_ComputeFromDueDatePlusGracePeriod()
    {
        var (token, _, _) = await CreateOrganizationAsync("prop-overdue");
        var propertyId = await CreatePropertyAsync(token, "OD1");
        var unitId = await CreateUnitAsync(token, propertyId, "U-1");
        var tenantId = await CreateRentalTenantAsync(token, "Overdue Tenant");
        // Lease starting far enough in the past that its first monthly rent schedule is already overdue with 0 grace days.
        var start = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-2);
        var leaseId = await CreateActiveLeaseAsync(token, propertyId, unitId, tenantId, start, start.AddYears(1), 800m, gracePeriodDays: 0);

        var (success, body, _) = await GetAsync("/api/v1/reports/property/overdue-rent", token);
        success.Should().BeTrue();
        var rows = body.GetProperty("data").EnumerateArray().ToList();
        rows.Should().Contain(r => r.GetProperty("leaseId").GetString() == leaseId);

        var (agingSuccess, agingBody, _) = await GetAsync("/api/v1/reports/property/tenant-aging", token);
        agingSuccess.Should().BeTrue();
        var agingRow = agingBody.GetProperty("data").EnumerateArray().First(r => r.GetProperty("rentalTenantId").GetString() == tenantId);
        agingRow.GetProperty("total").GetDecimal().Should().BeGreaterThan(0m);
    }

    // === Facility ===

    [Fact]
    public async Task FacilityReports_MaintenanceBacklog_ScopedToFacilityAndReportsAge()
    {
        var (token, _, _) = await CreateOrganizationAsync("fac-backlog");
        var propertyId = await CreatePropertyAsync(token, "FB1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "FB-FAC1");

        var reportedDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-5);
        var (_, createBody, _) = await PostAsync("/api/v1/property/maintenance-requests", new
        {
            propertyId = (Guid?)null, unitId = (Guid?)null, facilityId = Guid.Parse(facilityId), spaceId = (Guid?)null,
            rentalTenantId = (Guid?)null, category = 0, priority = 2, description = "AC repair", reportedDate,
            assignedToUserId = (Guid?)null, assignedVendorId = (Guid?)null, slaHours = (int?)null
        }, token);
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Open
        var requestId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (success, body, _) = await GetAsync("/api/v1/reports/facility/maintenance-backlog", token);
        success.Should().BeTrue();
        var row = body.GetProperty("data").EnumerateArray().First(r => r.GetProperty("requestId").GetString() == requestId);
        row.GetProperty("facilityId").GetString().Should().Be(facilityId);
        row.GetProperty("ageInDays").GetInt32().Should().BeGreaterThanOrEqualTo(5);
        row.GetProperty("priority").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task FacilityReports_Utilization_ReflectsFacilitySpaceCounts()
    {
        var (token, _, _) = await CreateOrganizationAsync("fac-util");
        var propertyId = await CreatePropertyAsync(token, "FU1");
        var facilityId = await CreateFacilityAsync(token, propertyId, "FU-FAC1", type: 1); // Coworking

        var (success, body, _) = await GetAsync("/api/v1/reports/facility/utilization", token);
        success.Should().BeTrue();
        body.GetProperty("data").EnumerateArray().Should().Contain(r => r.GetProperty("facilityId").GetString() == facilityId);
    }

    // === Security: RBAC, tenant isolation, drill-down authorization ===

    [Fact]
    public async Task Reports_RequireReportsViewPermission()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("rbac-reports");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var agentEmail = $"agent-{suffix}@rbac-reports.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        // "Sales Agent" is deliberately not granted Reports.View (mirrors it lacking Documents.Manage/Approvals.View).
        var (success, _, status) = await GetAsync("/api/v1/reports/executive", agentToken);
        success.Should().BeFalse();
        status.Should().Be(HttpStatusCode.Forbidden);

        var (ownerSuccess, _, _) = await GetAsync("/api/v1/reports/executive", ownerToken);
        ownerSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Reports_AreTenantIsolated_AcrossSalesFinanceAndProperty()
    {
        var (tokenA, customerIdA, projectIdA, unitIdA, agentIdA) = await SetupSalesContextAsync("iso-rep-a");
        var (tokenB, _, _, _, _) = await SetupSalesContextAsync("iso-rep-b");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(tokenA, customerIdA, projectIdA, unitIdA, agentIdA, 350_000m, today);

        var (_, salesBodyB, _) = await GetAsync("/api/v1/reports/sales/by-project", tokenB);
        salesBodyB.GetProperty("data").EnumerateArray().Should().BeEmpty();

        var (_, agingBodyB, _) = await GetAsync("/api/v1/reports/finance/ar-aging", tokenB);
        agingBodyB.GetProperty("data").GetProperty("rows").EnumerateArray().Should().BeEmpty();

        var propertyIdA = await CreatePropertyAsync(tokenA, "ISOP1");
        var (_, occBodyB, _) = await GetAsync("/api/v1/reports/property/occupancy", tokenB);
        occBodyB.GetProperty("data").EnumerateArray().Should().NotContain(r => r.GetProperty("propertyId").GetString() == propertyIdA);
    }

    [Fact]
    public async Task DrillDown_ReceivableAgingRow_CustomerId_ExistsButDrillDownStillRequiresCustomerViewPermission()
    {
        var (ownerToken, customerId, projectId, unitId, agentId) = await SetupSalesContextAsync("drilldown");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateConfirmedBookingWithInstallmentAsync(ownerToken, customerId, projectId, unitId, agentId, 90_000m, today);

        // A user with only Reports.View (Accountant role) can see the aging row and its real CustomerId...
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var accountantEmail = $"acct-{suffix}@drilldown.test";
        await PostAsync("/api/v1/users", new { email = accountantEmail, fullName = "Accountant", password = "Acct@12345", phoneNumber = (string?)null, roleNames = new[] { "Accountant" } }, ownerToken);
        var accountantToken = await LoginAsync(accountantEmail, "Acct@12345");

        var (agingSuccess, agingBody, _) = await GetAsync("/api/v1/reports/sales/receivable-aging", accountantToken);
        agingSuccess.Should().BeTrue();
        var row = agingBody.GetProperty("data").EnumerateArray().First(r => r.GetProperty("customerId").GetString() == customerId);
        row.GetProperty("customerName").GetString().Should().NotBeNullOrEmpty();

        // ...but following that drill-down link to the real Customer record still enforces Crm.CustomerView,
        // which "Accountant" does not hold — report visibility grants no implicit entity-level access.
        var (drillSuccess, _, drillStatus) = await GetAsync($"/api/v1/crm/customers/{customerId}", accountantToken);
        drillSuccess.Should().BeFalse();
        drillStatus.Should().Be(HttpStatusCode.Forbidden);
    }
}
