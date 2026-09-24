using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Property.RentSchedules;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class RentScheduleService : IRentScheduleService
{
    private readonly AppDbContext _db;

    public RentScheduleService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<RentScheduleDto>> ListAsync(PagedRequest request, RentScheduleFilter filter, CancellationToken ct = default)
    {
        var query = _db.RentSchedules.AsQueryable();
        if (filter.LeaseId.HasValue) query = query.Where(r => r.LeaseId == filter.LeaseId);
        if (filter.Status.HasValue) query = query.Where(r => r.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var schedules = await query.OrderBy(r => r.DueDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var dtos = await ToDtosAsync(schedules, ct);

        if (filter.OverdueOnly == true) dtos = dtos.Where(d => d.IsOverdue).ToList();

        return new PagedResult<RentScheduleDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<IReadOnlyList<RentScheduleDto>>> ListByLeaseAsync(Guid leaseId, CancellationToken ct = default)
    {
        var leaseExists = await _db.Leases.AnyAsync(l => l.Id == leaseId, ct);
        if (!leaseExists) return Result.Failure<IReadOnlyList<RentScheduleDto>>("Lease not found.", "not_found");

        var schedules = await _db.RentSchedules.Where(r => r.LeaseId == leaseId).OrderBy(r => r.PeriodNumber).ToListAsync(ct);
        return Result.Success<IReadOnlyList<RentScheduleDto>>(await ToDtosAsync(schedules, ct));
    }

    private async Task<List<RentScheduleDto>> ToDtosAsync(IReadOnlyCollection<RentSchedule> schedules, CancellationToken ct)
    {
        var leaseIds = schedules.Select(s => s.LeaseId).Distinct().ToList();
        var leases = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return schedules.Select(s =>
        {
            leases.TryGetValue(s.LeaseId, out var lease);
            var gracePeriodDays = lease?.GracePeriodDays ?? 0;
            var isOverdue = s.Status is RentScheduleStatus.Pending or RentScheduleStatus.PartiallyPaid
                             && today > s.DueDate.AddDays(gracePeriodDays);

            return new RentScheduleDto(
                s.Id, s.LeaseId, lease?.LeaseNumber ?? "", s.PeriodNumber, s.PeriodStart, s.PeriodEnd, s.DueDate,
                s.Amount, s.PaidAmount, s.Status, isOverdue);
        }).ToList();
    }
}
