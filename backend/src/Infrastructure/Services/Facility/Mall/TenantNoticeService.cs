using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class TenantNoticeService : ITenantNoticeService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public TenantNoticeService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<TenantNoticeDto>> ListAsync(PagedRequest request, TenantNoticeFilter filter, CancellationToken ct = default)
    {
        var query = _db.TenantNotices.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(n => n.FacilityId == filter.FacilityId);
        if (filter.RentalTenantId.HasValue) query = query.Where(n => n.RentalTenantId == filter.RentalTenantId);
        if (filter.Status.HasValue) query = query.Where(n => n.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var notices = await query.OrderByDescending(n => n.NoticeDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<TenantNoticeDto>(await ToDtosAsync(notices, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<TenantNoticeDto>> CreateAsync(CreateTenantNoticeRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<TenantNoticeDto>("Facility not found.", "not_found");

        if (request.RentalTenantId.HasValue)
        {
            var tenantExists = await _db.RentalTenants.AnyAsync(t => t.Id == request.RentalTenantId, ct);
            if (!tenantExists) return Result.Failure<TenantNoticeDto>("Tenant not found.", "not_found");
        }

        var notice = new TenantNotice
        {
            FacilityId = request.FacilityId,
            RentalTenantId = request.RentalTenantId,
            Subject = request.Subject,
            Content = request.Content,
            NoticeDate = request.NoticeDate
        };
        _db.TenantNotices.Add(notice);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "TenantNotice", notice.Id.ToString(), after: new { notice.Subject, notice.FacilityId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { notice }, ct))[0]);
    }

    public async Task<Result<TenantNoticeDto>> ChangeStatusAsync(Guid id, ChangeTenantNoticeStatusRequest request, CancellationToken ct = default)
    {
        var notice = await _db.TenantNotices.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (notice is null) return Result.Failure<TenantNoticeDto>("Notice not found.", "not_found");

        notice.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("ChangeStatus", "Facility", "TenantNotice", notice.Id.ToString(), after: new { notice.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { notice }, ct))[0]);
    }

    private async Task<List<TenantNoticeDto>> ToDtosAsync(IReadOnlyCollection<TenantNotice> notices, CancellationToken ct)
    {
        var facilityIds = notices.Select(n => n.FacilityId).Distinct().ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);
        var tenantIds = notices.Where(n => n.RentalTenantId.HasValue).Select(n => n.RentalTenantId!.Value).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));

        return notices.Select(n => new TenantNoticeDto(
            n.Id, n.FacilityId, facilityNames.GetValueOrDefault(n.FacilityId, ""), n.RentalTenantId,
            n.RentalTenantId.HasValue ? tenantNames.GetValueOrDefault(n.RentalTenantId.Value) : null,
            n.Subject, n.Content, n.NoticeDate, n.Status)).ToList();
    }
}
