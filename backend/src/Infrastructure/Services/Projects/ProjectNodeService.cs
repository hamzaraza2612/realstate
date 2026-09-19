using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Projects.Hierarchy;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Projects;

public class ProjectNodeService : IProjectNodeService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ProjectNodeService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<Result<IReadOnlyList<ProjectNodeDto>>> ListByProjectAsync(Guid projectId, CancellationToken ct = default)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId, ct);
        if (!projectExists) return Result.Failure<IReadOnlyList<ProjectNodeDto>>("Project not found.", "not_found");

        var nodes = await _db.ProjectNodes.Where(n => n.ProjectId == projectId).OrderBy(n => n.SortOrder).ThenBy(n => n.Name).ToListAsync(ct);
        return Result.Success<IReadOnlyList<ProjectNodeDto>>(await ToDtosAsync(nodes, ct));
    }

    public async Task<Result<ProjectNodeDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var node = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (node is null) return Result.Failure<ProjectNodeDto>("Hierarchy node not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { node }, ct))[0]);
    }

    public async Task<Result<ProjectNodeDto>> CreateAsync(CreateProjectNodeRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct);
        if (project is null) return Result.Failure<ProjectNodeDto>("Project not found.", "not_found");

        if (request.ParentNodeId.HasValue)
        {
            var parent = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == request.ParentNodeId, ct);
            if (parent is null) return Result.Failure<ProjectNodeDto>("Parent node not found.", "not_found");
            if (parent.ProjectId != request.ProjectId) return Result.Failure<ProjectNodeDto>("Parent node belongs to a different project.", "invalid_parent");
        }

        var codeExists = await _db.ProjectNodes.AnyAsync(n => n.ProjectId == request.ProjectId && n.Code == request.Code, ct);
        if (codeExists) return Result.Failure<ProjectNodeDto>("A hierarchy node with this code already exists in this project.", "duplicate_code");

        var node = new ProjectNode
        {
            ProjectId = request.ProjectId,
            ParentNodeId = request.ParentNodeId,
            NodeType = request.NodeType,
            Name = request.Name,
            Code = request.Code,
            SortOrder = request.SortOrder,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeoJson = request.GeoJson,
            MetadataJson = request.MetadataJson
        };

        _db.ProjectNodes.Add(node);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Projects", "ProjectNode", node.Id.ToString(),
            after: new { node.ProjectId, node.NodeType, node.Name, node.Code }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { node }, ct))[0]);
    }

    public async Task<Result<ProjectNodeDto>> UpdateAsync(Guid id, UpdateProjectNodeRequest request, CancellationToken ct = default)
    {
        var node = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (node is null) return Result.Failure<ProjectNodeDto>("Hierarchy node not found.", "not_found");

        var codeExists = await _db.ProjectNodes.AnyAsync(n => n.ProjectId == node.ProjectId && n.Code == request.Code && n.Id != id, ct);
        if (codeExists) return Result.Failure<ProjectNodeDto>("A hierarchy node with this code already exists in this project.", "duplicate_code");

        var before = new { node.Name, node.Code };
        node.Name = request.Name;
        node.Code = request.Code;
        node.SortOrder = request.SortOrder;
        node.Latitude = request.Latitude;
        node.Longitude = request.Longitude;
        node.GeoJson = request.GeoJson;
        node.MetadataJson = request.MetadataJson;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Projects", "ProjectNode", node.Id.ToString(), before,
            new { node.Name, node.Code }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { node }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var node = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (node is null) return Result.Failure("Hierarchy node not found.", "not_found");

        var hasChildren = await _db.ProjectNodes.AnyAsync(n => n.ParentNodeId == id, ct) ||
                           await _db.InventoryUnits.AnyAsync(u => u.NodeId == id, ct);
        if (hasChildren) return Result.Failure("Cannot delete a node that still has child nodes or inventory units.", "conflict");

        _db.ProjectNodes.Remove(node);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Projects", "ProjectNode", id.ToString(), before: new { node.Name, node.Code }, ct: ct);

        return Result.Success();
    }

    private async Task<List<ProjectNodeDto>> ToDtosAsync(IReadOnlyCollection<ProjectNode> nodes, CancellationToken ct)
    {
        var nodeIds = nodes.Select(n => n.Id).ToList();
        var childCounts = await _db.ProjectNodes.Where(n => n.ParentNodeId.HasValue && nodeIds.Contains(n.ParentNodeId.Value))
            .GroupBy(n => n.ParentNodeId!.Value).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var inventoryCounts = await _db.InventoryUnits.Where(u => u.NodeId.HasValue && nodeIds.Contains(u.NodeId.Value))
            .GroupBy(u => u.NodeId!.Value).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        return nodes.Select(n => new ProjectNodeDto(
            n.Id, n.ProjectId, n.ParentNodeId, n.NodeType, n.Name, n.Code, n.SortOrder,
            n.Latitude, n.Longitude, n.GeoJson, n.MetadataJson,
            childCounts.GetValueOrDefault(n.Id), inventoryCounts.GetValueOrDefault(n.Id),
            n.CreatedAt, n.UpdatedAt)).ToList();
    }
}
