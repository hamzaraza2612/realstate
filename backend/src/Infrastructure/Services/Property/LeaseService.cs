using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Property;

public class LeaseService : ILeaseService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public LeaseService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<LeaseDto>> ListAsync(PagedRequest request, LeaseFilter filter, CancellationToken ct = default)
    {
        var query = _db.Leases.AsQueryable();
        if (filter.PropertyId.HasValue) query = query.Where(l => l.PropertyId == filter.PropertyId);
        if (filter.UnitId.HasValue) query = query.Where(l => l.UnitId == filter.UnitId);
        if (filter.RentalTenantId.HasValue) query = query.Where(l => l.RentalTenantId == filter.RentalTenantId);
        if (filter.Status.HasValue) query = query.Where(l => l.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(l => l.LeaseNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var leases = await query.OrderByDescending(l => l.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<LeaseDto>(await ToDtosAsync(leases, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<LeaseDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lease is null) return Result.Failure<LeaseDto>("Lease not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { lease }, ct))[0]);
    }

    public async Task<Result<LeaseDto>> CreateAsync(CreateLeaseRequest request, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == request.PropertyId, ct);
        if (property is null) return Result.Failure<LeaseDto>("Property not found.", "not_found");

        var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == request.UnitId, ct);
        if (unit is null) return Result.Failure<LeaseDto>("Unit not found.", "not_found");
        if (unit.PropertyId != request.PropertyId) return Result.Failure<LeaseDto>("Unit belongs to a different property.", "invalid_unit");

        var tenant = await _db.RentalTenants.FirstOrDefaultAsync(t => t.Id == request.RentalTenantId, ct);
        if (tenant is null) return Result.Failure<LeaseDto>("Tenant not found.", "not_found");

        var conflictExists = await _db.Leases.AnyAsync(l => l.UnitId == request.UnitId && l.Status < LeaseStatus.Expired, ct);
        if (conflictExists) return Result.Failure<LeaseDto>("This unit already has a non-terminal lease.", "unit_has_active_lease");

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.Leases.CountAsync(ct) + 1 + attempt;
            var lease = new Lease
            {
                LeaseNumber = $"LSE-{sequence:D6}",
                PropertyId = request.PropertyId,
                UnitId = request.UnitId,
                RentalTenantId = request.RentalTenantId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                RentAmount = request.RentAmount,
                SecurityDeposit = request.SecurityDeposit,
                PaymentFrequency = request.PaymentFrequency,
                GracePeriodDays = request.GracePeriodDays,
                Status = LeaseStatus.Draft,
                Terms = request.Terms,
                Notes = request.Notes
            };
            _db.Leases.Add(lease);

            if (request.SecurityDeposit > 0)
            {
                _db.SecurityDeposits.Add(new SecurityDeposit { LeaseId = lease.Id, Amount = request.SecurityDeposit });
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Create", "Property", "Lease", lease.Id.ToString(),
                    after: new { lease.LeaseNumber, lease.UnitId, lease.RentalTenantId, lease.RentAmount }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { lease }, ct))[0]);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex, "IX_leases_UnitId"))
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                return Result.Failure<LeaseDto>("This unit already has a non-terminal lease.", "unit_has_active_lease");
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex, "IX_leases_TenantId_LeaseNumber"))
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
        }

        return Result.Failure<LeaseDto>("Could not generate a unique lease number, please retry.", "conflict");
    }

    public async Task<Result<LeaseDto>> UpdateAsync(Guid id, UpdateLeaseRequest request, CancellationToken ct = default)
    {
        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lease is null) return Result.Failure<LeaseDto>("Lease not found.", "not_found");
        if (lease.Status != LeaseStatus.Draft) return Result.Failure<LeaseDto>("Only a draft lease can be edited.", "invalid_state");

        lease.StartDate = request.StartDate;
        lease.EndDate = request.EndDate;
        lease.RentAmount = request.RentAmount;
        lease.SecurityDeposit = request.SecurityDeposit;
        lease.PaymentFrequency = request.PaymentFrequency;
        lease.GracePeriodDays = request.GracePeriodDays;
        lease.Terms = request.Terms;
        lease.Notes = request.Notes;

        var deposit = await _db.SecurityDeposits.FirstOrDefaultAsync(d => d.LeaseId == id, ct);
        if (request.SecurityDeposit > 0)
        {
            if (deposit is null) _db.SecurityDeposits.Add(new SecurityDeposit { LeaseId = id, Amount = request.SecurityDeposit });
            else deposit.Amount = request.SecurityDeposit;
        }

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Property", "Lease", lease.Id.ToString(), after: new { lease.RentAmount, lease.StartDate, lease.EndDate }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { lease }, ct))[0]);
    }

    public async Task<Result<LeaseDto>> ChangeStatusAsync(Guid id, ChangeLeaseStatusRequest request, CancellationToken ct = default)
    {
        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lease is null) return Result.Failure<LeaseDto>("Lease not found.", "not_found");
        if (!LeaseStatusRules.CanTransition(lease.Status, request.Status))
            return Result.Failure<LeaseDto>($"Cannot transition lease from {lease.Status} to {request.Status}.", "invalid_transition");

        var unit = await _db.PropertyUnits.FirstAsync(u => u.Id == lease.UnitId, ct);
        var before = lease.Status;
        lease.Status = request.Status;

        if (request.Status == LeaseStatus.Active)
        {
            var alreadyGenerated = await _db.RentSchedules.AnyAsync(r => r.LeaseId == lease.Id, ct);
            if (!alreadyGenerated) GenerateRentSchedule(lease);

            unit.Status = PropertyUnitStatus.Occupied;
        }
        else if (request.Status is LeaseStatus.Expired or LeaseStatus.Terminated)
        {
            if (unit.Status == PropertyUnitStatus.Occupied) unit.Status = PropertyUnitStatus.Available;

            var openSchedules = await _db.RentSchedules
                .Where(r => r.LeaseId == lease.Id && r.Status != RentScheduleStatus.Paid && r.Status != RentScheduleStatus.Cancelled)
                .ToListAsync(ct);
            foreach (var schedule in openSchedules.Where(s => s.PaidAmount <= 0)) schedule.Status = RentScheduleStatus.Cancelled;
        }

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("ChangeStatus", "Property", "Lease", lease.Id.ToString(), new { Status = before }, new { lease.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { lease }, ct))[0]);
    }

    /// <summary>Deterministic: the same lease dates/frequency always produce the same set of periods,
    /// so generation can safely be an idempotent side effect of activation rather than a separately
    /// triggered/undoable action.</summary>
    private void GenerateRentSchedule(Lease lease)
    {
        var monthStep = lease.PaymentFrequency switch
        {
            LeasePaymentFrequency.Monthly => 1,
            LeasePaymentFrequency.Quarterly => 3,
            LeasePaymentFrequency.Yearly => 12,
            _ => 1
        };

        var periodNumber = 1;
        var periodStart = lease.StartDate;
        while (periodStart <= lease.EndDate)
        {
            var nextStart = periodStart.AddMonths(monthStep);
            var periodEnd = nextStart.AddDays(-1) > lease.EndDate ? lease.EndDate : nextStart.AddDays(-1);

            _db.RentSchedules.Add(new RentSchedule
            {
                LeaseId = lease.Id,
                PeriodNumber = periodNumber,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                DueDate = periodStart,
                Amount = lease.RentAmount,
                Status = RentScheduleStatus.Pending
            });

            periodNumber++;
            periodStart = nextStart;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex, string constraintName) =>
        ex.InnerException is PostgresException { SqlState: "23505" } pg && pg.ConstraintName == constraintName;

    private async Task<List<LeaseDto>> ToDtosAsync(IReadOnlyCollection<Lease> leases, CancellationToken ct)
    {
        var propertyIds = leases.Select(l => l.PropertyId).Distinct().ToList();
        var propertyNames = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var unitIds = leases.Select(l => l.UnitId).Distinct().ToList();
        var unitNumbers = await _db.PropertyUnits.Where(u => unitIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.UnitNumber, ct);
        var tenantIds = leases.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNames = tenants.ToDictionary(t => t.Id, t => customerNames.GetValueOrDefault(t.CustomerId, ""));

        return leases.Select(l => new LeaseDto(
            l.Id, l.LeaseNumber, l.PropertyId, propertyNames.GetValueOrDefault(l.PropertyId, ""), l.UnitId, unitNumbers.GetValueOrDefault(l.UnitId, ""),
            l.RentalTenantId, tenantNames.GetValueOrDefault(l.RentalTenantId, ""), l.StartDate, l.EndDate, l.RentAmount, l.SecurityDeposit,
            l.PaymentFrequency, l.GracePeriodDays, l.Status, l.Terms, l.Notes, l.CreatedAt, l.UpdatedAt)).ToList();
    }
}
