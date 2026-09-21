using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance.FiscalPeriods;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class FiscalPeriodService : IFiscalPeriodService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public FiscalPeriodService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<IReadOnlyList<FiscalPeriodDto>> ListAsync(CancellationToken ct = default)
    {
        var periods = await _db.FiscalPeriods.OrderByDescending(p => p.StartDate).ToListAsync(ct);
        return await ToDtosAsync(periods, ct);
    }

    public async Task<Result<FiscalPeriodDto>> CreateAsync(CreateFiscalPeriodRequest request, CancellationToken ct = default)
    {
        var overlapping = await _db.FiscalPeriods.AnyAsync(
            p => p.StartDate <= request.EndDate && p.EndDate >= request.StartDate, ct);
        if (overlapping) return Result.Failure<FiscalPeriodDto>("This period overlaps an existing fiscal period.", "overlapping_period");

        var period = new FiscalPeriod { Name = request.Name, StartDate = request.StartDate, EndDate = request.EndDate };
        _db.FiscalPeriods.Add(period);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23P01" })
        {
            _db.ChangeTracker.Clear();
            return Result.Failure<FiscalPeriodDto>("This period overlaps an existing fiscal period.", "overlapping_period");
        }

        await _auditLogger.LogAsync("Create", "Finance", "FiscalPeriod", period.Id.ToString(),
            after: new { period.Name, period.StartDate, period.EndDate }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { period }, ct))[0]);
    }

    public async Task<Result<FiscalPeriodDto>> CloseAsync(Guid id, CancellationToken ct = default)
    {
        var period = await _db.FiscalPeriods.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (period is null) return Result.Failure<FiscalPeriodDto>("Fiscal period not found.", "not_found");
        if (period.Status == FiscalPeriodStatus.Closed) return Result.Failure<FiscalPeriodDto>("This period is already closed.", "already_closed");

        period.Status = FiscalPeriodStatus.Closed;
        period.ClosedAt = DateTimeOffset.UtcNow;
        period.ClosedByUserId = _tenantContext.UserId;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Close", "Finance", "FiscalPeriod", period.Id.ToString(),
            after: new { period.Status, period.ClosedAt }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { period }, ct))[0]);
    }

    public async Task<Result<FiscalPeriodDto>> ReopenAsync(Guid id, CancellationToken ct = default)
    {
        var period = await _db.FiscalPeriods.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (period is null) return Result.Failure<FiscalPeriodDto>("Fiscal period not found.", "not_found");
        if (period.Status == FiscalPeriodStatus.Open) return Result.Failure<FiscalPeriodDto>("This period is already open.", "already_open");

        period.Status = FiscalPeriodStatus.Open;
        period.ClosedAt = null;
        period.ClosedByUserId = null;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Reopen", "Finance", "FiscalPeriod", period.Id.ToString(), after: new { period.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { period }, ct))[0]);
    }

    private async Task<List<FiscalPeriodDto>> ToDtosAsync(IReadOnlyCollection<FiscalPeriod> periods, CancellationToken ct)
    {
        var userIds = periods.Where(p => p.ClosedByUserId.HasValue).Select(p => p.ClosedByUserId!.Value).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return periods.Select(p => new FiscalPeriodDto(
            p.Id, p.Name, p.StartDate, p.EndDate, p.Status, p.ClosedAt, p.ClosedByUserId,
            p.ClosedByUserId.HasValue ? userNames.GetValueOrDefault(p.ClosedByUserId.Value) : null, p.CreatedAt)).ToList();
    }
}
