using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Inventory;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public InventoryService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<InventoryUnitDto>> ListAsync(PagedRequest request, InventoryFilter filter, CancellationToken ct = default)
    {
        var query = _db.InventoryUnits.AsQueryable();

        if (filter.ProjectId.HasValue) query = query.Where(u => u.ProjectId == filter.ProjectId);
        if (filter.NodeId.HasValue) query = query.Where(u => u.NodeId == filter.NodeId);
        if (filter.Type.HasValue) query = query.Where(u => u.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(u => u.Status == filter.Status);
        if (filter.MinArea.HasValue) query = query.Where(u => u.AreaSize >= filter.MinArea);
        if (filter.MaxArea.HasValue) query = query.Where(u => u.AreaSize <= filter.MaxArea);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(u => u.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var units = await query.OrderBy(u => u.Code).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = await ToDtosAsync(units, ct);
        return new PagedResult<InventoryUnitDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<InventoryUnitDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<InventoryUnitDto>("Inventory unit not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result<InventoryUnitDto>> CreateAsync(CreateInventoryUnitRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct);
        if (project is null) return Result.Failure<InventoryUnitDto>("Project not found.", "not_found");

        if (request.NodeId.HasValue)
        {
            var node = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == request.NodeId, ct);
            if (node is null) return Result.Failure<InventoryUnitDto>("Hierarchy node not found.", "not_found");
            if (node.ProjectId != request.ProjectId) return Result.Failure<InventoryUnitDto>("Hierarchy node belongs to a different project.", "invalid_node");
        }

        var codeExists = await _db.InventoryUnits.AnyAsync(u => u.ProjectId == request.ProjectId && u.Code == request.Code, ct);
        if (codeExists) return Result.Failure<InventoryUnitDto>("An inventory unit with this code already exists in this project.", "duplicate_code");

        var unit = new InventoryUnit
        {
            ProjectId = request.ProjectId,
            NodeId = request.NodeId,
            Code = request.Code,
            Type = request.Type,
            Status = InventoryStatus.Available,
            AreaSize = request.AreaSize,
            AreaUnit = request.AreaUnit,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeoJson = request.GeoJson,
            MetadataJson = request.MetadataJson
        };

        _db.InventoryUnits.Add(unit);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Inventory", "InventoryUnit", unit.Id.ToString(),
            after: new { unit.ProjectId, unit.Code, unit.Type }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result<InventoryUnitDto>> UpdateAsync(Guid id, UpdateInventoryUnitRequest request, CancellationToken ct = default)
    {
        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<InventoryUnitDto>("Inventory unit not found.", "not_found");

        if (request.NodeId.HasValue)
        {
            var node = await _db.ProjectNodes.FirstOrDefaultAsync(n => n.Id == request.NodeId, ct);
            if (node is null) return Result.Failure<InventoryUnitDto>("Hierarchy node not found.", "not_found");
            if (node.ProjectId != unit.ProjectId) return Result.Failure<InventoryUnitDto>("Hierarchy node belongs to a different project.", "invalid_node");
        }

        var codeExists = await _db.InventoryUnits.AnyAsync(u => u.ProjectId == unit.ProjectId && u.Code == request.Code && u.Id != id, ct);
        if (codeExists) return Result.Failure<InventoryUnitDto>("An inventory unit with this code already exists in this project.", "duplicate_code");

        var before = new { unit.Code, unit.Type, unit.NodeId };
        unit.NodeId = request.NodeId;
        unit.Code = request.Code;
        unit.Type = request.Type;
        unit.AreaSize = request.AreaSize;
        unit.AreaUnit = request.AreaUnit;
        unit.Latitude = request.Latitude;
        unit.Longitude = request.Longitude;
        unit.GeoJson = request.GeoJson;
        unit.MetadataJson = request.MetadataJson;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Inventory", "InventoryUnit", unit.Id.ToString(), before,
            new { unit.Code, unit.Type, unit.NodeId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure("Inventory unit not found.", "not_found");
        if (unit.Status != InventoryStatus.Available) return Result.Failure("Only units with Available status can be deleted.", "conflict");

        _db.InventoryUnits.Remove(unit);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Inventory", "InventoryUnit", id.ToString(), before: new { unit.Code }, ct: ct);

        return Result.Success();
    }

    public async Task<Result<InventoryUnitDto>> ChangeStatusAsync(Guid id, ChangeInventoryStatusRequest request, CancellationToken ct = default)
    {
        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (unit is null) return Result.Failure<InventoryUnitDto>("Inventory unit not found.", "not_found");

        if (!InventoryStatusRules.CanTransition(unit.Status, request.Status))
        {
            return Result.Failure<InventoryUnitDto>(
                $"Cannot transition inventory status from {unit.Status} to {request.Status}.", "invalid_transition");
        }

        var before = unit.Status;
        unit.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Inventory", "InventoryUnit", unit.Id.ToString(),
            new { Status = before }, new { unit.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { unit }, ct))[0]);
    }

    private async Task<List<InventoryUnitDto>> ToDtosAsync(IReadOnlyCollection<InventoryUnit> units, CancellationToken ct)
    {
        var projectIds = units.Select(u => u.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var nodesByProject = await _db.ProjectNodes.Where(n => projectIds.Contains(n.ProjectId))
            .ToListAsync(ct);
        var nodesById = nodesByProject.ToDictionary(n => n.Id);

        return units.Select(u => new InventoryUnitDto(
            u.Id, u.ProjectId, projectNames.GetValueOrDefault(u.ProjectId, ""),
            u.NodeId, BuildNodePath(u.NodeId, nodesById),
            u.Code, u.Type, u.Status, u.AreaSize, u.AreaUnit,
            u.Latitude, u.Longitude, u.GeoJson, u.MetadataJson,
            u.CreatedAt, u.UpdatedAt)).ToList();
    }

    private static string? BuildNodePath(Guid? nodeId, IReadOnlyDictionary<Guid, ProjectNode> nodesById)
    {
        if (!nodeId.HasValue) return null;

        var segments = new List<string>();
        var current = nodeId;
        var visited = new HashSet<Guid>();
        while (current.HasValue && nodesById.TryGetValue(current.Value, out var node) && visited.Add(current.Value))
        {
            segments.Insert(0, node.Name);
            current = node.ParentNodeId;
        }
        return segments.Count > 0 ? string.Join(" > ", segments) : null;
    }
}
