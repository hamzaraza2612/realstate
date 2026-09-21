using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Property;

public class SecurityDepositService : ISecurityDepositService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public SecurityDepositService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<Result<SecurityDepositDto>> GetByLeaseAsync(Guid leaseId, CancellationToken ct = default)
    {
        var deposit = await _db.SecurityDeposits.FirstOrDefaultAsync(d => d.LeaseId == leaseId, ct);
        if (deposit is null) return Result.Failure<SecurityDepositDto>("No security deposit recorded for this lease.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { deposit }, ct))[0]);
    }

    public async Task<Result<SecurityDepositDto>> ReceiveAsync(Guid id, ReceiveSecurityDepositRequest request, CancellationToken ct = default)
    {
        var deposit = await _db.SecurityDeposits.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (deposit is null) return Result.Failure<SecurityDepositDto>("Security deposit not found.", "not_found");
        if (!SecurityDepositStatusRules.CanTransition(deposit.Status, SecurityDepositStatus.Held))
            return Result.Failure<SecurityDepositDto>($"Cannot mark a {deposit.Status} deposit as received.", "invalid_transition");

        deposit.ReceivedDate = request.ReceivedDate;
        deposit.Status = SecurityDepositStatus.Held;
        deposit.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Receive", "Property", "SecurityDeposit", deposit.Id.ToString(), after: new { deposit.Status, deposit.ReceivedDate }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { deposit }, ct))[0]);
    }

    public async Task<Result<SecurityDepositDto>> RefundAsync(Guid id, RefundSecurityDepositRequest request, CancellationToken ct = default)
    {
        var deposit = await _db.SecurityDeposits.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (deposit is null) return Result.Failure<SecurityDepositDto>("Security deposit not found.", "not_found");

        var target = request.Amount >= deposit.Amount - deposit.RefundedAmount - Tolerance
            ? SecurityDepositStatus.Refunded
            : SecurityDepositStatus.PartiallyRefunded;
        if (!SecurityDepositStatusRules.CanTransition(deposit.Status, target))
            return Result.Failure<SecurityDepositDto>($"Cannot refund a {deposit.Status} deposit.", "invalid_transition");

        var remaining = deposit.Amount - deposit.RefundedAmount;
        if (request.Amount > remaining + Tolerance)
            return Result.Failure<SecurityDepositDto>($"Refund of {request.Amount:0.00} exceeds the remaining held amount of {remaining:0.00}.", "overrefund_not_allowed");

        deposit.RefundedAmount += request.Amount;
        deposit.RefundDate = request.RefundDate;
        deposit.Status = target;
        deposit.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Refund", "Property", "SecurityDeposit", deposit.Id.ToString(), after: new { deposit.Status, deposit.RefundedAmount }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { deposit }, ct))[0]);
    }

    public async Task<Result<SecurityDepositDto>> ForfeitAsync(Guid id, ForfeitSecurityDepositRequest request, CancellationToken ct = default)
    {
        var deposit = await _db.SecurityDeposits.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (deposit is null) return Result.Failure<SecurityDepositDto>("Security deposit not found.", "not_found");
        if (!SecurityDepositStatusRules.CanTransition(deposit.Status, SecurityDepositStatus.Forfeited))
            return Result.Failure<SecurityDepositDto>($"Cannot forfeit a {deposit.Status} deposit.", "invalid_transition");

        deposit.Status = SecurityDepositStatus.Forfeited;
        deposit.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Forfeit", "Property", "SecurityDeposit", deposit.Id.ToString(), after: new { deposit.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { deposit }, ct))[0]);
    }

    private async Task<List<SecurityDepositDto>> ToDtosAsync(IReadOnlyCollection<SecurityDeposit> deposits, CancellationToken ct)
    {
        var leaseIds = deposits.Select(d => d.LeaseId).Distinct().ToList();
        var leaseNumbers = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.LeaseNumber, ct);

        return deposits.Select(d => new SecurityDepositDto(
            d.Id, d.LeaseId, leaseNumbers.GetValueOrDefault(d.LeaseId, ""), d.Amount, d.ReceivedDate, d.Status,
            d.RefundedAmount, d.RefundDate, d.Notes)).ToList();
    }
}
