using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.AuditLogs;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services;

public class AuditLogQueryService : IAuditLogQueryService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public AuditLogQueryService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<PagedResult<AuditLogDto>> ListAsync(PagedRequest request, AuditLogFilter filter, CancellationToken ct = default)
    {
        // AuditLog is not ITenantOwned (TenantId is nullable to allow platform-level entries), so it gets
        // no automatic EF query filter. Tenant scoping is therefore enforced explicitly here: a normal
        // tenant caller only ever sees its own tenant's logs; only an explicit platform-authorized bypass
        // (set by a Super-Admin-only controller) sees across tenants.
        var query = _db.AuditLogs.AsQueryable();
        if (!_tenantContext.BypassTenantFilter)
        {
            query = query.Where(a => a.TenantId == _tenantContext.TenantId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Module)) query = query.Where(a => a.Module == filter.Module);
        if (!string.IsNullOrWhiteSpace(filter.Action)) query = query.Where(a => a.Action == filter.Action);
        if (!string.IsNullOrWhiteSpace(filter.EntityType)) query = query.Where(a => a.EntityType == filter.EntityType);
        if (filter.From.HasValue) query = query.Where(a => a.CreatedAt >= filter.From);
        if (filter.To.HasValue) query = query.Where(a => a.CreatedAt <= filter.To);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = items.Select(a => new AuditLogDto(
            a.Id, a.TenantId, a.UserId, a.UserEmail, a.Action, a.Module, a.EntityType, a.EntityId,
            a.BeforeJson, a.AfterJson, a.IpAddress, a.CreatedAt)).ToList();

        return new PagedResult<AuditLogDto>(dtos, request.Page, request.PageSize, total);
    }
}
