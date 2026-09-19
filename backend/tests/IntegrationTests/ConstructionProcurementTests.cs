using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class ConstructionProcurementTests : TestBase
{
    public ConstructionProcurementTests(CustomWebApplicationFactory factory) : base(factory) { }

    private async Task<string> CreateProjectAsync(string token, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/projects", new
        {
            name = $"Project {code}", code, type = 3, description = (string?)null, addressLine = (string?)null,
            city = (string?)null, state = (string?)null, country = (string?)null, postalCode = (string?)null,
            startDate = (DateOnly?)null, endDate = (DateOnly?)null, latitude = (decimal?)null, longitude = (decimal?)null, geoJson = (string?)null
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<string> CreateWorkPackageAsync(string token, string projectId, string code)
    {
        var (_, body, _) = await PostAsync("/api/v1/construction/work-packages", new
        {
            projectId = Guid.Parse(projectId), name = $"WP {code}", code, description = (string?)null,
            plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null, managerUserId = (Guid?)null, budget = (decimal?)null
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

    private async Task<string> CreateMaterialAsync(string token, string sku)
    {
        var (_, body, _) = await PostAsync("/api/v1/materials", new { sku, name = $"Material {sku}", unitOfMeasure = "bag", category = (string?)null, minimumQuantity = 10m }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    private async Task<(string OwnerToken, string ProjectId, string WorkPackageId, string VendorId, string MaterialId)> SetupContextAsync(string prefix)
    {
        var (token, _, _) = await CreateOrganizationAsync(prefix);
        var codeBase = prefix.ToUpperInvariant().Replace("-", "");
        var projectId = await CreateProjectAsync(token, codeBase[..Math.Min(8, codeBase.Length)]);
        var wpId = await CreateWorkPackageAsync(token, projectId, "WP1");
        var vendorId = await CreateVendorAsync(token, $"{prefix} Vendor");
        var materialId = await CreateMaterialAsync(token, codeBase[..Math.Min(6, codeBase.Length)]);
        return (token, projectId, wpId, vendorId, materialId);
    }

    private static object PoLine(string? materialId, string desc, decimal qty, decimal unitPrice) => new
    {
        materialId = materialId is null ? (Guid?)null : Guid.Parse(materialId),
        itemDescription = desc,
        unitOfMeasure = "bag",
        quantity = qty,
        unitPrice
    };

    private async Task<string> CreatePurchaseOrderAsync(string token, string vendorId, string projectId, string? materialId, decimal qty, decimal unitPrice, decimal discount = 0, decimal tax = 0)
    {
        var (_, body, _) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId),
            projectId = Guid.Parse(projectId),
            workPackageId = (Guid?)null,
            purchaseRequestId = (Guid?)null,
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow),
            expectedDeliveryDate = (DateOnly?)null,
            discount,
            taxAmount = tax,
            notes = (string?)null,
            lines = new[] { PoLine(materialId, "Cement", qty, unitPrice) }
        }, token);
        return body.GetProperty("data").GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task Vendor_CanBeCreatedUpdatedAndDeleted()
    {
        var (token, _, _) = await CreateOrganizationAsync("vendor-crud");
        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/procurement/vendors", new
        {
            name = "Acme Supplies", contactPerson = "Jane", email = "jane@acme.test", phone = "555-1",
            address = "123 St", taxRegistrationNumber = "TX-1", notes = (string?)null
        }, token);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var vendorId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/procurement/vendors/{vendorId}", new
        {
            name = "Acme Supplies Renamed", contactPerson = "Jane", email = "jane@acme.test", phone = "555-1",
            address = "123 St", taxRegistrationNumber = "TX-1", isActive = true, notes = (string?)null
        }, token);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("name").GetString().Should().Be("Acme Supplies Renamed");

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/procurement/vendors/{vendorId}", token);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task WorkPackage_CrudAndUniqueCodePerProject()
    {
        var (token, _, _) = await CreateOrganizationAsync("wp-crud");
        var projectId = await CreateProjectAsync(token, "WPCRUD");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/construction/work-packages", new
        {
            projectId = Guid.Parse(projectId), name = "Foundation", code = "WP-1", description = (string?)null,
            plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null, managerUserId = (Guid?)null, budget = 50000m
        }, token);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Planned
        var wpId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (dupeSuccess, _, dupeStatus) = await PostAsync("/api/v1/construction/work-packages", new
        {
            projectId = Guid.Parse(projectId), name = "Foundation 2", code = "WP-1", description = (string?)null,
            plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null, managerUserId = (Guid?)null, budget = (decimal?)null
        }, token);
        dupeSuccess.Should().BeFalse();
        dupeStatus.Should().Be(HttpStatusCode.BadRequest);

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/construction/work-packages/{wpId}", new
        {
            name = "Foundation Updated", description = (string?)null, plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null,
            actualStartDate = (DateOnly?)null, actualEndDate = (DateOnly?)null, progressPercent = 25, managerUserId = (Guid?)null, budget = 60000m
        }, token);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("progressPercent").GetInt32().Should().Be(25);
    }

    [Fact]
    public async Task WorkPackage_StatusTransitions_ValidAndInvalid()
    {
        var (token, projectId, wpId, _, _) = await SetupContextAsync("wp-status");

        var (invalidSuccess, _, invalidStatus) = await PostAsync($"/api/v1/construction/work-packages/{wpId}/status", new { status = 3 }, token); // Planned -> Completed invalid
        invalidSuccess.Should().BeFalse();
        invalidStatus.Should().Be(HttpStatusCode.BadRequest);

        var (toProgress, toProgressBody, _) = await PostAsync($"/api/v1/construction/work-packages/{wpId}/status", new { status = 1 }, token); // InProgress
        toProgress.Should().BeTrue();
        toProgressBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);

        var (toCompleted, toCompletedBody, _) = await PostAsync($"/api/v1/construction/work-packages/{wpId}/status", new { status = 3 }, token); // Completed
        toCompleted.Should().BeTrue();
        toCompletedBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3);

        var (afterTerminal, _, afterTerminalStatus) = await PostAsync($"/api/v1/construction/work-packages/{wpId}/status", new { status = 1 }, token);
        afterTerminal.Should().BeFalse();
        afterTerminalStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ConstructionTask_CrudAndStatusTransitions()
    {
        var (token, _, wpId, _, _) = await SetupContextAsync("task-crud");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/construction/tasks", new
        {
            workPackageId = Guid.Parse(wpId), title = "Pour concrete", description = (string?)null, assignedToUserId = (Guid?)null,
            priority = 2, plannedStartDate = (DateOnly?)null, plannedEndDate = (DateOnly?)null, dependsOnTaskId = (Guid?)null
        }, token);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        var taskId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (blockedInvalid, _, blockedInvalidStatus) = await PostAsync($"/api/v1/construction/tasks/{taskId}/status", new { status = 2 }, token); // Planned -> Blocked invalid
        blockedInvalid.Should().BeFalse();
        blockedInvalidStatus.Should().Be(HttpStatusCode.BadRequest);

        await PostAsync($"/api/v1/construction/tasks/{taskId}/status", new { status = 1 }, token); // InProgress
        var (blockedSuccess, blockedBody, _) = await PostAsync($"/api/v1/construction/tasks/{taskId}/status", new { status = 2 }, token); // Blocked
        blockedSuccess.Should().BeTrue();
        blockedBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2);

        await PostAsync($"/api/v1/construction/tasks/{taskId}/status", new { status = 1 }, token); // back to InProgress
        var (completeSuccess, completeBody, _) = await PostAsync($"/api/v1/construction/tasks/{taskId}/status", new { status = 3 }, token); // Completed
        completeSuccess.Should().BeTrue();
        completeBody.GetProperty("data").GetProperty("progressPercent").GetInt32().Should().Be(100);
    }

    [Fact]
    public async Task PurchaseRequest_FullLifecycle()
    {
        var (token, projectId, wpId, _, materialId) = await SetupContextAsync("pr-lifecycle");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/procurement/purchase-requests", new
        {
            projectId = Guid.Parse(projectId), workPackageId = Guid.Parse(wpId), requiredDate = (DateOnly?)null, priority = 1, notes = (string?)null,
            lines = new[] { new { materialId = Guid.Parse(materialId), itemDescription = "Cement bags", unitOfMeasure = "bag", quantity = 100m, estimatedUnitPrice = 10m } }
        }, token);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Draft
        createBody.GetProperty("data").GetProperty("estimatedTotal").GetDecimal().Should().Be(1000m);
        var prId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (approveTooEarly, _, approveTooEarlyStatus) = await PostAsync($"/api/v1/procurement/purchase-requests/{prId}/approve", new { }, token);
        approveTooEarly.Should().BeFalse();
        approveTooEarlyStatus.Should().Be(HttpStatusCode.BadRequest);

        var (submitSuccess, submitBody, _) = await PostAsync($"/api/v1/procurement/purchase-requests/{prId}/submit", new { }, token);
        submitSuccess.Should().BeTrue();
        submitBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Submitted

        var (approveSuccess, approveBody, _) = await PostAsync($"/api/v1/procurement/purchase-requests/{prId}/approve", new { }, token);
        approveSuccess.Should().BeTrue();
        approveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Approved
    }

    [Fact]
    public async Task PurchaseOrder_CalculatesTotalsServerSide_AndCanBeCreatedFromApprovedRequest()
    {
        var (token, projectId, wpId, vendorId, materialId) = await SetupContextAsync("po-calc");

        var (_, prBody, _) = await PostAsync("/api/v1/procurement/purchase-requests", new
        {
            projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, requiredDate = (DateOnly?)null, priority = 1, notes = (string?)null,
            lines = new[] { new { materialId = Guid.Parse(materialId), itemDescription = "Cement bags", unitOfMeasure = "bag", quantity = 10m, estimatedUnitPrice = 10m } }
        }, token);
        var prId = prBody.GetProperty("data").GetProperty("id").GetString()!;

        // Cannot create a PO from a request that isn't approved yet.
        var (tooEarlySuccess, _, tooEarlyStatus) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId), projectId = Guid.Parse(projectId), workPackageId = (Guid?)null, purchaseRequestId = Guid.Parse(prId),
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow), expectedDeliveryDate = (DateOnly?)null, discount = 0m, taxAmount = 0m, notes = (string?)null,
            lines = new[] { PoLine(materialId, "Cement", 100m, 12m) }
        }, token);
        tooEarlySuccess.Should().BeFalse();
        tooEarlyStatus.Should().Be(HttpStatusCode.BadRequest);

        await PostAsync($"/api/v1/procurement/purchase-requests/{prId}/submit", new { }, token);
        await PostAsync($"/api/v1/procurement/purchase-requests/{prId}/approve", new { }, token);

        var (poSuccess, poBody, poStatus) = await PostAsync("/api/v1/procurement/purchase-orders", new
        {
            vendorId = Guid.Parse(vendorId), projectId = Guid.Parse(projectId), workPackageId = Guid.Parse(wpId), purchaseRequestId = Guid.Parse(prId),
            orderDate = DateOnly.FromDateTime(DateTime.UtcNow), expectedDeliveryDate = (DateOnly?)null, discount = 50m, taxAmount = 25m, notes = (string?)null,
            lines = new[] { PoLine(materialId, "Cement", 100m, 12m) }
        }, token);
        poSuccess.Should().BeTrue();
        poStatus.Should().Be(HttpStatusCode.Created);
        poBody.GetProperty("data").GetProperty("subtotal").GetDecimal().Should().Be(1200m);
        poBody.GetProperty("data").GetProperty("total").GetDecimal().Should().Be(1175m); // 1200 - 50 + 25
        poBody.GetProperty("data").GetProperty("purchaseRequestNumber").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task PurchaseOrder_StatusTransitions_ValidAndInvalid()
    {
        var (token, projectId, _, vendorId, materialId) = await SetupContextAsync("po-status");
        var poId = await CreatePurchaseOrderAsync(token, vendorId, projectId, materialId, 10m, 5m);

        var (invalidApprove, _, invalidApproveStatus) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/approve", new { }, token);
        invalidApprove.Should().BeFalse();
        invalidApproveStatus.Should().Be(HttpStatusCode.BadRequest);

        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/submit", new { }, token);
        var (approveSuccess, approveBody, _) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/approve", new { }, token);
        approveSuccess.Should().BeTrue();
        approveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Approved

        var (sendSuccess, sendBody, _) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/send", new { }, token);
        sendSuccess.Should().BeTrue();
        sendBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(3); // Sent
    }

    [Fact]
    public async Task Receiving_SupportsPartialReceiving_AndUpdatesPoStatusAndStock()
    {
        var (token, projectId, _, vendorId, materialId) = await SetupContextAsync("recv-partial");
        var poId = await CreatePurchaseOrderAsync(token, vendorId, projectId, materialId, 100m, 10m);
        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/submit", new { }, token);
        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/approve", new { }, token);
        await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/send", new { }, token);

        var (_, poBody, _) = await GetAsync($"/api/v1/procurement/purchase-orders/{poId}", token);
        var poLineId = poBody.GetProperty("data").GetProperty("lines")[0].GetProperty("id").GetString()!;

        var (partialSuccess, _, _) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/receipts", new
        {
            receivedDate = DateOnly.FromDateTime(DateTime.UtcNow), notes = (string?)null,
            lines = new[] { new { purchaseOrderLineId = Guid.Parse(poLineId), receivedQuantity = 60m } }
        }, token);
        partialSuccess.Should().BeTrue();

        var (_, afterPartialBody, _) = await GetAsync($"/api/v1/procurement/purchase-orders/{poId}", token);
        afterPartialBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(4); // PartiallyReceived
        afterPartialBody.GetProperty("data").GetProperty("lines")[0].GetProperty("outstandingQuantity").GetDecimal().Should().Be(40m);

        var (materialSuccess, materialBody, _) = await GetAsync($"/api/v1/materials/{materialId}", token);
        materialSuccess.Should().BeTrue();
        materialBody.GetProperty("data").GetProperty("currentQuantity").GetDecimal().Should().Be(60m);

        // Over-receiving: only 40 remains, so 50 must be rejected.
        var (overSuccess, _, overStatus) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/receipts", new
        {
            receivedDate = DateOnly.FromDateTime(DateTime.UtcNow), notes = (string?)null,
            lines = new[] { new { purchaseOrderLineId = Guid.Parse(poLineId), receivedQuantity = 50m } }
        }, token);
        overSuccess.Should().BeFalse();
        overStatus.Should().Be(HttpStatusCode.Conflict);

        var (finalSuccess, finalBody, _) = await PostAsync($"/api/v1/procurement/purchase-orders/{poId}/receipts", new
        {
            receivedDate = DateOnly.FromDateTime(DateTime.UtcNow), notes = (string?)null,
            lines = new[] { new { purchaseOrderLineId = Guid.Parse(poLineId), receivedQuantity = 40m } }
        }, token);
        finalSuccess.Should().BeTrue();

        var (_, afterFinalBody, _) = await GetAsync($"/api/v1/procurement/purchase-orders/{poId}", token);
        afterFinalBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(5); // Received

        var (_, finalMaterialBody, _) = await GetAsync($"/api/v1/materials/{materialId}", token);
        finalMaterialBody.GetProperty("data").GetProperty("currentQuantity").GetDecimal().Should().Be(100m);

        var (movementsSuccess, movementsBody, _) = await GetAsync($"/api/v1/materials/{materialId}/movements", token);
        movementsSuccess.Should().BeTrue();
        movementsBody.GetProperty("data").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task Material_ManualStockMovement_UpdatesQuantityAndRejectsNegativeStock()
    {
        var (token, _, _, _, materialId) = await SetupContextAsync("stock-manual");

        var (adjustSuccess, _, _) = await PostAsync($"/api/v1/materials/{materialId}/movements", new { type = 2, quantity = 50m, notes = "Initial stock" }, token);
        adjustSuccess.Should().BeTrue();

        var (_, materialBody, _) = await GetAsync($"/api/v1/materials/{materialId}", token);
        materialBody.GetProperty("data").GetProperty("currentQuantity").GetDecimal().Should().Be(50m);

        var (issueSuccess, _, _) = await PostAsync($"/api/v1/materials/{materialId}/movements", new { type = 1, quantity = -20m, notes = "Issued to site" }, token);
        issueSuccess.Should().BeTrue();

        var (negativeSuccess, _, negativeStatus) = await PostAsync($"/api/v1/materials/{materialId}/movements", new { type = 1, quantity = -1000m, notes = (string?)null }, token);
        negativeSuccess.Should().BeFalse();
        negativeStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Expense_ApprovalPostsFinancialJournalEntry_AndRejectionDoesNot()
    {
        var (token, projectId, wpId, vendorId, _) = await SetupContextAsync("expense-finance");

        var (createSuccess, createBody, _) = await PostAsync("/api/v1/construction/expenses", new
        {
            projectId = Guid.Parse(projectId), workPackageId = Guid.Parse(wpId), category = 2, amount = 5000m,
            expenseDate = DateOnly.FromDateTime(DateTime.UtcNow), vendorId = Guid.Parse(vendorId), referenceNumber = "INV-1", notes = (string?)null
        }, token);
        createSuccess.Should().BeTrue();
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Pending
        var expenseId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (approveSuccess, approveBody, _) = await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, token);
        approveSuccess.Should().BeTrue();
        approveBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Approved
        var journalEntryId = approveBody.GetProperty("data").GetProperty("journalEntryId").GetString();
        journalEntryId.Should().NotBeNull();

        var (journalSuccess, journalBody, _) = await GetAsync($"/api/v1/finance/journal-entries/{journalEntryId}", token);
        journalSuccess.Should().BeTrue();
        journalBody.GetProperty("data").GetProperty("referenceType").GetString().Should().Be("ConstructionExpense");
        journalBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1); // Posted
        journalBody.GetProperty("data").GetProperty("totalDebit").GetDecimal().Should().Be(5000m);
        journalBody.GetProperty("data").GetProperty("totalCredit").GetDecimal().Should().Be(5000m);

        // Cannot approve twice.
        var (reApproveSuccess, _, reApproveStatus) = await PostAsync($"/api/v1/construction/expenses/{expenseId}/approve", new { }, token);
        reApproveSuccess.Should().BeFalse();
        reApproveStatus.Should().Be(HttpStatusCode.BadRequest);

        // A rejected expense creates no journal entry.
        var (_, secondExpenseBody, _) = await PostAsync("/api/v1/construction/expenses", new
        {
            projectId = Guid.Parse(projectId), workPackageId = Guid.Parse(wpId), category = 0, amount = 1000m,
            expenseDate = DateOnly.FromDateTime(DateTime.UtcNow), vendorId = (Guid?)null, referenceNumber = (string?)null, notes = (string?)null
        }, token);
        var secondExpenseId = secondExpenseBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, beforeRejectBody, _) = await GetAsync("/api/v1/finance/journal-entries?referenceType=ConstructionExpense", token);
        var countBefore = beforeRejectBody.GetProperty("meta").GetProperty("total").GetInt32();

        var (rejectSuccess, rejectBody, _) = await PostAsync($"/api/v1/construction/expenses/{secondExpenseId}/reject", new { }, token);
        rejectSuccess.Should().BeTrue();
        rejectBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2); // Rejected

        var (_, afterRejectBody, _) = await GetAsync("/api/v1/finance/journal-entries?referenceType=ConstructionExpense", token);
        afterRejectBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(countBefore);
    }

    [Fact]
    public async Task ConstructionAndProcurementData_AreIsolatedPerTenant()
    {
        var (tokenA, projectIdA, wpIdA, vendorIdA, materialIdA) = await SetupContextAsync("iso-a");
        var (tokenB, _, _, _, _) = await SetupContextAsync("iso-b");

        var poId = await CreatePurchaseOrderAsync(tokenA, vendorIdA, projectIdA, materialIdA, 10m, 5m);

        var (bWpSuccess, bWpBody, _) = await GetAsync("/api/v1/construction/work-packages", tokenB);
        bWpSuccess.Should().BeTrue();
        bWpBody.GetProperty("data").EnumerateArray().Any(w => w.GetProperty("id").GetString() == wpIdA).Should().BeFalse();

        var (bPoGetSuccess, _, bPoGetStatus) = await GetAsync($"/api/v1/procurement/purchase-orders/{poId}", tokenB);
        bPoGetSuccess.Should().BeFalse();
        bPoGetStatus.Should().Be(HttpStatusCode.NotFound);

        var (bVendorListSuccess, bVendorListBody, _) = await GetAsync("/api/v1/procurement/vendors", tokenB);
        bVendorListSuccess.Should().BeTrue();
        bVendorListBody.GetProperty("data").EnumerateArray().Any(v => v.GetProperty("id").GetString() == vendorIdA).Should().BeFalse();
    }

    [Fact]
    public async Task SalesAgent_CannotAccessProcurement_ButProcurementOfficerCan()
    {
        var (ownerToken, projectId, _, _, _) = await SetupContextAsync("proc-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var agentEmail = $"agent-{suffix}@proc-rbac.test";
        await PostAsync("/api/v1/users", new { email = agentEmail, fullName = "Agent", password = "Agent@12345", phoneNumber = (string?)null, roleNames = new[] { "Sales Agent" } }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var officerEmail = $"officer-{suffix}@proc-rbac.test";
        await PostAsync("/api/v1/users", new { email = officerEmail, fullName = "Officer", password = "Officer@12345", phoneNumber = (string?)null, roleNames = new[] { "Procurement Officer" } }, ownerToken);
        var officerToken = await LoginAsync(officerEmail, "Officer@12345");

        var (agentSuccess, _, agentStatus) = await GetAsync("/api/v1/procurement/vendors", agentToken);
        agentSuccess.Should().BeFalse();
        agentStatus.Should().Be(HttpStatusCode.Forbidden);

        var (officerSuccess, _, officerStatus) = await PostAsync("/api/v1/procurement/vendors", new
        {
            name = "Officer Vendor", contactPerson = (string?)null, email = (string?)null, phone = (string?)null,
            address = (string?)null, taxRegistrationNumber = (string?)null, notes = (string?)null
        }, officerToken);
        officerSuccess.Should().BeTrue();
        officerStatus.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task ConstructionDashboard_AndProcurementDashboard_AreTenantScoped()
    {
        var (tokenA, projectIdA, wpIdA, vendorIdA, materialIdA) = await SetupContextAsync("dash-a");
        var (tokenB, _, _, _, _) = await SetupContextAsync("dash-b");

        await CreatePurchaseOrderAsync(tokenA, vendorIdA, projectIdA, materialIdA, 10m, 5m);

        var (constructionSuccessA, constructionBodyA, _) = await GetAsync("/api/v1/construction/dashboard", tokenA);
        constructionSuccessA.Should().BeTrue();
        constructionBodyA.GetProperty("data").GetProperty("totalWorkPackages").GetInt32().Should().Be(1);

        var (constructionSuccessB, constructionBodyB, _) = await GetAsync("/api/v1/construction/dashboard", tokenB);
        constructionSuccessB.Should().BeTrue();
        constructionBodyB.GetProperty("data").GetProperty("totalWorkPackages").GetInt32().Should().Be(1); // tenant B has its own WP1 from setup

        var (procSuccessA, procBodyA, _) = await GetAsync("/api/v1/procurement/dashboard", tokenA);
        procSuccessA.Should().BeTrue();
        procBodyA.GetProperty("data").GetProperty("totalPurchaseOrders").GetInt32().Should().Be(1);

        var (procSuccessB, procBodyB, _) = await GetAsync("/api/v1/procurement/dashboard", tokenB);
        procSuccessB.Should().BeTrue();
        procBodyB.GetProperty("data").GetProperty("totalPurchaseOrders").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task AuditLog_RecordsConstructionAndProcurementActions()
    {
        var (token, projectId, wpId, vendorId, materialId) = await SetupContextAsync("audit-cp");
        await CreatePurchaseOrderAsync(token, vendorId, projectId, materialId, 10m, 5m);

        var (constructionAuditSuccess, constructionAuditBody, _) = await GetAsync("/api/v1/audit-logs?module=Construction", token);
        constructionAuditSuccess.Should().BeTrue();
        constructionAuditBody.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);

        var (procurementAuditSuccess, procurementAuditBody, _) = await GetAsync("/api/v1/audit-logs?module=Procurement", token);
        procurementAuditSuccess.Should().BeTrue();
        procurementAuditBody.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
    }
}
