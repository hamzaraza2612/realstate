using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class DeskService : IDeskService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public DeskService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<DeskDto>> ListAsync(PagedRequest request, DeskFilter filter, CancellationToken ct = default)
    {
        var query = _db.Desks.AsQueryable();
        if (filter.SpaceId.HasValue) query = query.Where(d => d.SpaceId == filter.SpaceId);
        if (filter.Status.HasValue) query = query.Where(d => d.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var desks = await query.OrderBy(d => d.Code).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var spaceCodes = await _db.Spaces.Where(s => desks.Select(d => d.SpaceId).Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Code, ct);

        var dtos = desks.Select(d => new DeskDto(d.Id, d.SpaceId, spaceCodes.GetValueOrDefault(d.SpaceId, ""), d.Code, d.Type, d.Status)).ToList();
        return new PagedResult<DeskDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<DeskDto>> CreateAsync(CreateDeskRequest request, CancellationToken ct = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(s => s.Id == request.SpaceId, ct);
        if (space is null) return Result.Failure<DeskDto>("Space not found.", "not_found");

        var duplicate = await _db.Desks.AnyAsync(d => d.SpaceId == request.SpaceId && d.Code == request.Code, ct);
        if (duplicate) return Result.Failure<DeskDto>("A desk with this code already exists in this space.", "duplicate_code");

        var desk = new Desk { SpaceId = request.SpaceId, Code = request.Code, Type = request.Type };
        _db.Desks.Add(desk);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "Desk", desk.Id.ToString(), after: new { desk.Code, desk.SpaceId }, ct: ct);

        return Result.Success(new DeskDto(desk.Id, desk.SpaceId, space.Code, desk.Code, desk.Type, desk.Status));
    }

    public async Task<Result<DeskDto>> UpdateAsync(Guid id, UpdateDeskRequest request, CancellationToken ct = default)
    {
        var desk = await _db.Desks.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (desk is null) return Result.Failure<DeskDto>("Desk not found.", "not_found");

        desk.Code = request.Code;
        desk.Type = request.Type;
        desk.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        var space = await _db.Spaces.FirstAsync(s => s.Id == desk.SpaceId, ct);
        await _auditLogger.LogAsync("Update", "Facility", "Desk", desk.Id.ToString(), after: new { desk.Code, desk.Status }, ct: ct);

        return Result.Success(new DeskDto(desk.Id, desk.SpaceId, space.Code, desk.Code, desk.Type, desk.Status));
    }
}
