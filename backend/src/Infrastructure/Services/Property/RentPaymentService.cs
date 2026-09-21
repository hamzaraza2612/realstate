using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance;
using RealEstateErp.Application.Property.Payments;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Property;

public class RentPaymentService : IRentPaymentService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IRentalPaymentPostingService _financePosting;

    public RentPaymentService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger, IRentalPaymentPostingService financePosting)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _financePosting = financePosting;
    }

    public async Task<Result<IReadOnlyList<RentPaymentDto>>> ListByLeaseAsync(Guid leaseId, CancellationToken ct = default)
    {
        var leaseExists = await _db.Leases.AnyAsync(l => l.Id == leaseId, ct);
        if (!leaseExists) return Result.Failure<IReadOnlyList<RentPaymentDto>>("Lease not found.", "not_found");

        var payments = await _db.RentPayments.Where(p => p.LeaseId == leaseId).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<RentPaymentDto>>(await ToDtosAsync(payments, ct));
    }

    public async Task<Result<RentPaymentDto>> RecordAsync(Guid leaseId, RecordRentPaymentRequest request, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.RentPayments.FirstOrDefaultAsync(
                p => p.LeaseId == leaseId && p.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return Result.Success((await ToDtosAsync(new[] { existing }, ct))[0]);
        }

        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == leaseId, ct);
        if (lease is null) return Result.Failure<RentPaymentDto>("Lease not found.", "not_found");

        var schedule = await _db.RentSchedules.FirstOrDefaultAsync(r => r.Id == request.RentScheduleId && r.LeaseId == leaseId, ct);
        if (schedule is null) return Result.Failure<RentPaymentDto>("Rent schedule line not found for this lease.", "not_found");
        if (schedule.Status == RentScheduleStatus.Cancelled)
            return Result.Failure<RentPaymentDto>("This rent obligation has been cancelled and can no longer accept payments.", "schedule_cancelled");
        if (schedule.Status == RentScheduleStatus.Paid)
            return Result.Failure<RentPaymentDto>("This rent obligation is already fully paid.", "already_paid");

        var outstanding = schedule.Amount - schedule.PaidAmount;
        if (request.Amount > outstanding + Tolerance)
        {
            return Result.Failure<RentPaymentDto>(
                $"Payment of {request.Amount:0.00} exceeds the outstanding amount of {outstanding:0.00} for this rent period.", "overpayment_not_allowed");
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.RentPayments.CountAsync(ct) + 1 + attempt;
            var payment = new RentPayment
            {
                ReceiptNumber = $"RNT-{sequence:D6}",
                LeaseId = leaseId,
                RentScheduleId = schedule.Id,
                Amount = request.Amount,
                PaymentDate = request.PaymentDate,
                Method = request.Method,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes,
                RecordedByUserId = _tenantContext.UserId ?? Guid.Empty,
                IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey
            };
            _db.RentPayments.Add(payment);

            schedule.PaidAmount += request.Amount;
            schedule.Status = schedule.PaidAmount >= schedule.Amount - Tolerance
                ? RentScheduleStatus.Paid
                : RentScheduleStatus.PartiallyPaid;

            var postingResult = await _financePosting.PostRentalPaymentAsync(
                payment.Id, payment.Amount, payment.PaymentDate, payment.ReferenceNumber, ct);
            if (!postingResult.Succeeded)
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                return Result.Failure<RentPaymentDto>(postingResult.Error!, postingResult.ErrorCode!);
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Record", "Property", "RentPayment", payment.Id.ToString(),
                    after: new { payment.ReceiptNumber, payment.LeaseId, payment.RentScheduleId, payment.Amount }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { payment }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                schedule = await _db.RentSchedules.FirstAsync(r => r.Id == request.RentScheduleId, ct);
            }
        }

        return Result.Failure<RentPaymentDto>("Could not generate a unique receipt number, please retry.", "conflict");
    }

    private async Task<List<RentPaymentDto>> ToDtosAsync(IReadOnlyCollection<RentPayment> payments, CancellationToken ct)
    {
        var leaseIds = payments.Select(p => p.LeaseId).Distinct().ToList();
        var leaseNumbers = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.LeaseNumber, ct);
        var scheduleIds = payments.Select(p => p.RentScheduleId).Distinct().ToList();
        var schedulePeriods = await _db.RentSchedules.Where(r => scheduleIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r.PeriodNumber, ct);
        var userIds = payments.Select(p => p.RecordedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var paymentIds = payments.Select(p => p.Id).ToList();
        var journalEntryIds = await _db.JournalEntries
            .Where(j => j.ReferenceType == "RentalPayment" && j.ReferenceId.HasValue && paymentIds.Contains(j.ReferenceId.Value))
            .ToDictionaryAsync(j => j.ReferenceId!.Value, j => j.Id, ct);

        return payments.Select(p => new RentPaymentDto(
            p.Id, p.ReceiptNumber, p.LeaseId, leaseNumbers.GetValueOrDefault(p.LeaseId, ""), p.RentScheduleId,
            schedulePeriods.GetValueOrDefault(p.RentScheduleId, 0), p.Amount, p.PaymentDate, p.Method, p.ReferenceNumber, p.Notes,
            p.RecordedByUserId, userNames.GetValueOrDefault(p.RecordedByUserId),
            journalEntryIds.TryGetValue(p.Id, out var journalEntryId) ? journalEntryId : null, p.CreatedAt)).ToList();
    }
}
