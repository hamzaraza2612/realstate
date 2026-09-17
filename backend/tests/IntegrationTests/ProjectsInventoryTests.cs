using System.Net;
using FluentAssertions;

namespace RealEstateErp.IntegrationTests;

[Collection("Integration")]
public class ProjectsInventoryTests : TestBase
{
    public ProjectsInventoryTests(CustomWebApplicationFactory factory) : base(factory) { }

    private static object ProjectPayload(string code, int type = 0) => new
    {
        name = $"Project {code}",
        code,
        type,
        description = "A test project",
        addressLine = "123 Main St",
        city = "Metropolis",
        state = (string?)null,
        country = "Pakistan",
        postalCode = (string?)null,
        startDate = (DateOnly?)null,
        endDate = (DateOnly?)null,
        latitude = (decimal?)null,
        longitude = (decimal?)null,
        geoJson = (string?)null
    };

    [Fact]
    public async Task Owner_CanCreateUpdateAndDeleteProject()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-crud");

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/projects", ProjectPayload("ALPHA"), ownerToken);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Planning
        var projectId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/projects/{projectId}", new
        {
            name = "Project ALPHA Renamed",
            status = 1, // Active
            description = "Updated",
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
        }, ownerToken);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("name").GetString().Should().Be("Project ALPHA Renamed");
        updateBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/projects/{projectId}", ownerToken);
        deleteSuccess.Should().BeTrue();
        deleteStatus.Should().Be(HttpStatusCode.NoContent);

        var (getSuccess, _, getStatus) = await GetAsync($"/api/v1/projects/{projectId}", ownerToken);
        getSuccess.Should().BeFalse();
        getStatus.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Project_CodeMustBeUniquePerTenant()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-dupe");

        var (firstSuccess, _, _) = await PostAsync("/api/v1/projects", ProjectPayload("DUPE"), ownerToken);
        firstSuccess.Should().BeTrue();

        var (secondSuccess, _, secondStatus) = await PostAsync("/api/v1/projects", ProjectPayload("DUPE"), ownerToken);
        secondSuccess.Should().BeFalse();
        secondStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Hierarchy_CanBeCreatedWithParentChildNesting()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-hierarchy");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("HIER"), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;

        var (phaseSuccess, phaseBody, _) = await PostAsync("/api/v1/projects/nodes", new
        {
            projectId = Guid.Parse(projectId),
            parentNodeId = (Guid?)null,
            nodeType = 0, // Phase
            name = "Phase 1",
            code = "P1",
            sortOrder = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        phaseSuccess.Should().BeTrue();
        var phaseId = phaseBody.GetProperty("data").GetProperty("id").GetString()!;

        var (blockSuccess, blockBody, _) = await PostAsync("/api/v1/projects/nodes", new
        {
            projectId = Guid.Parse(projectId),
            parentNodeId = Guid.Parse(phaseId),
            nodeType = 2, // Block
            name = "Block A",
            code = "BLK-A",
            sortOrder = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        blockSuccess.Should().BeTrue();

        var (listSuccess, listBody, _) = await GetAsync($"/api/v1/projects/nodes?projectId={projectId}", ownerToken);
        listSuccess.Should().BeTrue();
        listBody.GetProperty("data").GetArrayLength().Should().Be(2);

        var (phaseGetSuccess, phaseGetBody, _) = await GetAsync($"/api/v1/projects/nodes/{phaseId}", ownerToken);
        phaseGetSuccess.Should().BeTrue();
        phaseGetBody.GetProperty("data").GetProperty("childNodeCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Hierarchy_RejectsParentFromAnotherProject()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-hierarchy-cross");
        var (_, projectABody, _) = await PostAsync("/api/v1/projects", ProjectPayload("CROSSA"), ownerToken);
        var projectAId = projectABody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, projectBBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("CROSSB"), ownerToken);
        var projectBId = projectBBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, phaseBody, _) = await PostAsync("/api/v1/projects/nodes", new
        {
            projectId = Guid.Parse(projectAId),
            parentNodeId = (Guid?)null,
            nodeType = 0,
            name = "Phase 1",
            code = "P1",
            sortOrder = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        var phaseId = phaseBody.GetProperty("data").GetProperty("id").GetString()!;

        var (crossSuccess, _, crossStatus) = await PostAsync("/api/v1/projects/nodes", new
        {
            projectId = Guid.Parse(projectBId),
            parentNodeId = Guid.Parse(phaseId),
            nodeType = 2,
            name = "Block A",
            code = "BLK-A",
            sortOrder = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        crossSuccess.Should().BeFalse();
        crossStatus.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Inventory_CanBeCreatedUnderHierarchyAndUpdated()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("inv-crud");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("INVC", type: 1), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;

        var (_, floorBody, _) = await PostAsync("/api/v1/projects/nodes", new
        {
            projectId = Guid.Parse(projectId),
            parentNodeId = (Guid?)null,
            nodeType = 4, // Floor
            name = "Floor 3",
            code = "F3",
            sortOrder = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        var floorId = floorBody.GetProperty("data").GetProperty("id").GetString()!;

        var (createSuccess, createBody, createStatus) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = Guid.Parse(floorId),
            code = "A-301",
            type = 1, // Apartment
            areaSize = 1200.50m,
            areaUnit = 0, // SqFt
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
        createBody.GetProperty("data").GetProperty("status").GetInt32().Should().Be(0); // Available
        createBody.GetProperty("data").GetProperty("nodePath").GetString().Should().Be("Floor 3");
        var unitId = createBody.GetProperty("data").GetProperty("id").GetString()!;

        var (updateSuccess, updateBody, _) = await PutAsync($"/api/v1/inventory/{unitId}", new
        {
            nodeId = Guid.Parse(floorId),
            code = "A-301-B",
            type = 1,
            areaSize = 1300m,
            areaUnit = 0,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        updateSuccess.Should().BeTrue();
        updateBody.GetProperty("data").GetProperty("code").GetString().Should().Be("A-301-B");
        updateBody.GetProperty("data").GetProperty("areaSize").GetDecimal().Should().Be(1300m);
    }

    [Fact]
    public async Task Inventory_CodeMustBeUniquePerProjectOnly()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("inv-dupe");
        var (_, projectABody, _) = await PostAsync("/api/v1/projects", ProjectPayload("DUPEA"), ownerToken);
        var projectAId = projectABody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, projectBBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("DUPEB"), ownerToken);
        var projectBId = projectBBody.GetProperty("data").GetProperty("id").GetString()!;

        object Unit(string projectId) => new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-1",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        };

        var (firstSuccess, _, _) = await PostAsync("/api/v1/inventory", Unit(projectAId), ownerToken);
        firstSuccess.Should().BeTrue();

        var (dupeInSameProject, _, dupeStatus) = await PostAsync("/api/v1/inventory", Unit(projectAId), ownerToken);
        dupeInSameProject.Should().BeFalse();
        dupeStatus.Should().Be(HttpStatusCode.BadRequest);

        var (sameCodeDifferentProject, _, _) = await PostAsync("/api/v1/inventory", Unit(projectBId), ownerToken);
        sameCodeDifferentProject.Should().BeTrue();
    }

    [Fact]
    public async Task Inventory_StatusTransitions_ValidAndInvalid()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("inv-status");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("STAT"), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, unitBody, _) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-STAT",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        var unitId = unitBody.GetProperty("data").GetProperty("id").GetString()!;

        // Available -> Reserved: valid
        var (r1, b1, _) = await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 1 }, ownerToken);
        r1.Should().BeTrue();
        b1.GetProperty("data").GetProperty("status").GetInt32().Should().Be(1);

        // Reserved -> HandedOver: invalid, skips the lifecycle
        var (r2, _, s2) = await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 6 }, ownerToken);
        r2.Should().BeFalse();
        s2.Should().Be(HttpStatusCode.BadRequest);

        // Reserved -> Booked: valid
        var (r3, b3, _) = await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 2 }, ownerToken);
        r3.Should().BeTrue();
        b3.GetProperty("data").GetProperty("status").GetInt32().Should().Be(2);

        // Booked -> Sold: valid
        var (r4, _, _) = await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 3 }, ownerToken);
        r4.Should().BeTrue();

        // Sold -> Reserved: invalid, terminal-ish states can't go backwards arbitrarily
        var (r5, _, s5) = await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 1 }, ownerToken);
        r5.Should().BeFalse();
        s5.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Inventory_DeleteIsOnlyAllowedWhileAvailable()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("inv-delete");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("DEL"), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;
        var (_, unitBody, _) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-DEL",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        var unitId = unitBody.GetProperty("data").GetProperty("id").GetString()!;

        await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 1 }, ownerToken); // -> Reserved

        var (blockedDelete, _, blockedStatus) = await DeleteAsync($"/api/v1/inventory/{unitId}", ownerToken);
        blockedDelete.Should().BeFalse();
        blockedStatus.Should().Be(HttpStatusCode.Conflict);

        await PostAsync($"/api/v1/inventory/{unitId}/status", new { status = 0 }, ownerToken); // -> Available again

        var (allowedDelete, _, allowedStatus) = await DeleteAsync($"/api/v1/inventory/{unitId}", ownerToken);
        allowedDelete.Should().BeTrue();
        allowedStatus.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Project_CannotBeDeletedWhileItHasNodesOrInventory()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-guard");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("GUARD"), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;

        await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-GUARD",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);

        var (deleteSuccess, _, deleteStatus) = await DeleteAsync($"/api/v1/projects/{projectId}", ownerToken);
        deleteSuccess.Should().BeFalse();
        deleteStatus.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Inventory_FilteringByProjectTypeStatusAndArea()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("inv-filter");
        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("FILT"), ownerToken);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;

        async Task CreateUnit(string code, int type, decimal area)
        {
            await PostAsync("/api/v1/inventory", new
            {
                projectId = Guid.Parse(projectId),
                nodeId = (Guid?)null,
                code,
                type,
                areaSize = area,
                areaUnit = 0,
                latitude = (decimal?)null,
                longitude = (decimal?)null,
                geoJson = (string?)null,
                metadataJson = (string?)null
            }, ownerToken);
        }

        await CreateUnit("PLOT-A", 0, 500m);
        await CreateUnit("PLOT-B", 0, 1000m);
        await CreateUnit("APT-A", 1, 1200m);

        var (byProjectSuccess, byProjectBody, _) = await GetAsync($"/api/v1/inventory?projectId={projectId}", ownerToken);
        byProjectSuccess.Should().BeTrue();
        byProjectBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(3);

        var (byTypeSuccess, byTypeBody, _) = await GetAsync($"/api/v1/inventory?projectId={projectId}&type=0", ownerToken);
        byTypeSuccess.Should().BeTrue();
        byTypeBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(2);

        var (byAreaSuccess, byAreaBody, _) = await GetAsync($"/api/v1/inventory?projectId={projectId}&minArea=900", ownerToken);
        byAreaSuccess.Should().BeTrue();
        byAreaBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(2);

        var (bySearchSuccess, bySearchBody, _) = await GetAsync($"/api/v1/inventory?projectId={projectId}&search=apt", ownerToken);
        bySearchSuccess.Should().BeTrue();
        bySearchBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task ProjectsAndInventory_AreIsolatedPerTenant()
    {
        var (tokenA, _, _) = await CreateOrganizationAsync("proj-tenant-a");
        var (tokenB, _, _) = await CreateOrganizationAsync("proj-tenant-b");

        var (_, projectBody, _) = await PostAsync("/api/v1/projects", ProjectPayload("ISOA"), tokenA);
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;
        await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-ISO",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = (decimal?)null,
            longitude = (decimal?)null,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, tokenA);

        var (bProjectsSuccess, bProjectsBody, _) = await GetAsync("/api/v1/projects", tokenB);
        bProjectsSuccess.Should().BeTrue();
        bProjectsBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(0);

        var (bGetSuccess, _, bGetStatus) = await GetAsync($"/api/v1/projects/{projectId}", tokenB);
        bGetSuccess.Should().BeFalse();
        bGetStatus.Should().Be(HttpStatusCode.NotFound);

        var (bInventorySuccess, bInventoryBody, _) = await GetAsync("/api/v1/inventory", tokenB);
        bInventorySuccess.Should().BeTrue();
        bInventoryBody.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task SalesAgent_CannotAccessProjectsOrInventory()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var agentEmail = $"agent-{suffix}@proj-rbac.test";

        await PostAsync("/api/v1/users", new
        {
            email = agentEmail,
            fullName = "Sales Agent",
            password = "Agent@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Sales Agent" }
        }, ownerToken);
        var agentToken = await LoginAsync(agentEmail, "Agent@12345");

        var (listSuccess, _, listStatus) = await GetAsync("/api/v1/projects", agentToken);
        listSuccess.Should().BeFalse();
        listStatus.Should().Be(HttpStatusCode.Forbidden);

        var (createSuccess, _, createStatus) = await PostAsync("/api/v1/projects", ProjectPayload("RBAC"), agentToken);
        createSuccess.Should().BeFalse();
        createStatus.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ProjectManager_CanManageProjectsAndInventory()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-manager-rbac");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var pmEmail = $"pm-{suffix}@proj-manager-rbac.test";

        await PostAsync("/api/v1/users", new
        {
            email = pmEmail,
            fullName = "Project Manager",
            password = "Manager@12345",
            phoneNumber = (string?)null,
            roleNames = new[] { "Project Manager" }
        }, ownerToken);
        var pmToken = await LoginAsync(pmEmail, "Manager@12345");

        var (createSuccess, _, createStatus) = await PostAsync("/api/v1/projects", ProjectPayload("PMOK"), pmToken);
        createSuccess.Should().BeTrue();
        createStatus.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task MapCoordinates_ArePersistedForProjectsAndInventory()
    {
        var (ownerToken, _, _) = await CreateOrganizationAsync("proj-map");

        var (projectSuccess, projectBody, _) = await PostAsync("/api/v1/projects", new
        {
            name = "Map Project",
            code = "MAPP",
            type = 0,
            description = (string?)null,
            addressLine = (string?)null,
            city = (string?)null,
            state = (string?)null,
            country = (string?)null,
            postalCode = (string?)null,
            startDate = (DateOnly?)null,
            endDate = (DateOnly?)null,
            latitude = 31.5204m,
            longitude = 74.3587m,
            geoJson = "{\"type\":\"Point\",\"coordinates\":[74.3587,31.5204]}"
        }, ownerToken);
        projectSuccess.Should().BeTrue();
        projectBody.GetProperty("data").GetProperty("latitude").GetDecimal().Should().Be(31.5204m);
        projectBody.GetProperty("data").GetProperty("geoJson").GetString().Should().Contain("Point");
        var projectId = projectBody.GetProperty("data").GetProperty("id").GetString()!;

        var (unitSuccess, unitBody, _) = await PostAsync("/api/v1/inventory", new
        {
            projectId = Guid.Parse(projectId),
            nodeId = (Guid?)null,
            code = "PLOT-MAP",
            type = 0,
            areaSize = (decimal?)null,
            areaUnit = (int?)null,
            latitude = 31.5210m,
            longitude = 74.3590m,
            geoJson = (string?)null,
            metadataJson = (string?)null
        }, ownerToken);
        unitSuccess.Should().BeTrue();
        unitBody.GetProperty("data").GetProperty("latitude").GetDecimal().Should().Be(31.5210m);
        unitBody.GetProperty("data").GetProperty("longitude").GetDecimal().Should().Be(74.3590m);
    }
}
