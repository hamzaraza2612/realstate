using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Projects.Projects;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Projects;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ProjectService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ProjectDto>> ListAsync(PagedRequest request, ProjectFilter filter, CancellationToken ct = default)
    {
        var query = _db.Projects.AsQueryable();

        if (filter.Type.HasValue) query = query.Where(p => p.Type == filter.Type);
        if (filter.Status.HasValue) query = query.Where(p => p.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var projects = await query.OrderByDescending(p => p.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = await ToDtosAsync(projects, ct);
        return new PagedResult<ProjectDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<ProjectDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return Result.Failure<ProjectDto>("Project not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { project }, ct))[0]);
    }

    public async Task<Result<ProjectDto>> CreateAsync(CreateProjectRequest request, CancellationToken ct = default)
    {
        var codeExists = await _db.Projects.AnyAsync(p => p.Code == request.Code, ct);
        if (codeExists) return Result.Failure<ProjectDto>("A project with this code already exists.", "duplicate_code");

        var project = new Project
        {
            Name = request.Name,
            Code = request.Code,
            Type = request.Type,
            Status = ProjectStatus.Planning,
            Description = request.Description,
            AddressLine = request.AddressLine,
            City = request.City,
            State = request.State,
            Country = request.Country,
            PostalCode = request.PostalCode,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeoJson = request.GeoJson
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Projects", "Project", project.Id.ToString(),
            after: new { project.Name, project.Code, project.Type }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { project }, ct))[0]);
    }

    public async Task<Result<ProjectDto>> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return Result.Failure<ProjectDto>("Project not found.", "not_found");

        var before = new { project.Name, project.Status };
        project.Name = request.Name;
        project.Status = request.Status;
        project.Description = request.Description;
        project.AddressLine = request.AddressLine;
        project.City = request.City;
        project.State = request.State;
        project.Country = request.Country;
        project.PostalCode = request.PostalCode;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.Latitude = request.Latitude;
        project.Longitude = request.Longitude;
        project.GeoJson = request.GeoJson;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Projects", "Project", project.Id.ToString(), before,
            new { project.Name, project.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { project }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return Result.Failure("Project not found.", "not_found");

        var hasChildren = await _db.ProjectNodes.AnyAsync(n => n.ProjectId == id, ct) ||
                           await _db.InventoryUnits.AnyAsync(u => u.ProjectId == id, ct);
        if (hasChildren) return Result.Failure("Cannot delete a project that still has hierarchy nodes or inventory units.", "conflict");

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Projects", "Project", id.ToString(), before: new { project.Name }, ct: ct);

        return Result.Success();
    }

    private async Task<List<ProjectDto>> ToDtosAsync(IReadOnlyCollection<Project> projects, CancellationToken ct)
    {
        var projectIds = projects.Select(p => p.Id).ToList();
        var nodeCounts = await _db.ProjectNodes.Where(n => projectIds.Contains(n.ProjectId))
            .GroupBy(n => n.ProjectId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var inventoryCounts = await _db.InventoryUnits.Where(u => projectIds.Contains(u.ProjectId))
            .GroupBy(u => u.ProjectId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        return projects.Select(p => new ProjectDto(
            p.Id, p.Name, p.Code, p.Type, p.Status, p.Description,
            p.AddressLine, p.City, p.State, p.Country, p.PostalCode,
            p.StartDate, p.EndDate, p.Latitude, p.Longitude, p.GeoJson,
            nodeCounts.GetValueOrDefault(p.Id), inventoryCounts.GetValueOrDefault(p.Id),
            p.CreatedAt, p.UpdatedAt)).ToList();
    }
}
