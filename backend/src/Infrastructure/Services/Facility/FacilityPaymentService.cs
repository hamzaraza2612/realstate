using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Payments;
using RealEstateErp.Application.Finance;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Facility;

/// <summary>Records a payment against one chargeable facility record (service charge, parking, coworking
/// membership/booking, or utility) and posts it to Finance atomically — a single service handles every
/// billing subtype instead of one payment service per subtype, since each source row just needs an
/// Amount/PaidAmount pair. Mirrors Sales.PaymentService/Property.RentPaymentService's transaction and
/// idempotency pattern exactly.</summary>
public class FacilityPaymentService : IFacilityPaymentService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IFacilityFinancePostingService _financePosting;

    public FacilityPaymentService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger, IFacilityFinancePostingService financePosting)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _financePosting = financePosting;
    }

    public async Task<Result<IReadOnlyList<FacilityPaymentDto>>> ListBySourceAsync(FacilityPaymentSourceType sourceType, Guid sourceId, CancellationToken ct = default)
    {
        var payments = await _db.FacilityPayments
            .Where(p => p.SourceType == sourceType && p.SourceId == sourceId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<FacilityPaymentDto>>(await ToDtosAsync(payments, ct));
    }

    public async Task<Result<FacilityPaymentDto>> RecordAsync(RecordFacilityPaymentRequest request, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.FacilityPayments.FirstOrDefaultAsync(
                p => p.SourceType == request.SourceType && p.SourceId == request.SourceId && p.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return Result.Success((await ToDtosAsync(new[] { existing }, ct))[0]);
        }

        var outstandingResult = await GetOutstandingAsync(request.SourceType, request.SourceId, ct);
        if (!outstandingResult.Succeeded) return Result.Failure<FacilityPaymentDto>(outstandingResult.Error!, outstandingResult.ErrorCode!);

        var outstanding = outstandingResult.Value;
        if (request.Amount > outstanding + Tolerance)
        {
            return Result.Failure<FacilityPaymentDto>(
                $"Payment of {request.Amount:0.00} exceeds the outstanding amount of {outstanding:0.00}.", "overpayment_not_allowed");
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.FacilityPayments.CountAsync(ct) + 1 + attempt;
            var payment = new FacilityPayment
            {
                ReceiptNumber = $"FAC-{sequence:D6}",
                SourceType = request.SourceType,
                SourceId = request.SourceId,
                Amount = request.Amount,
                PaymentDate = request.PaymentDate,
                Method = request.Method,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes,
                RecordedByUserId = _tenantContext.UserId ?? Guid.Empty,
                IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey
            };
            _db.FacilityPayments.Add(payment);

            await ApplyPaymentToSourceAsync(request.SourceType, request.SourceId, request.Amount, ct);

            var referenceType = $"Facility{request.SourceType}";
            var postingResult = await _financePosting.PostFacilityRevenueAsync(payment.Id, payment.Amount, payment.PaymentDate, referenceType, payment.ReferenceNumber, ct);
            if (!postingResult.Succeeded)
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                return Result.Failure<FacilityPaymentDto>(postingResult.Error!, postingResult.ErrorCode!);
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Record", "Facility", "FacilityPayment", payment.Id.ToString(),
                    after: new { payment.ReceiptNumber, payment.SourceType, payment.SourceId, payment.Amount }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { payment }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
        }

        return Result.Failure<FacilityPaymentDto>("Could not generate a unique receipt number, please retry.", "conflict");
    }

    private async Task<Result<decimal>> GetOutstandingAsync(FacilityPaymentSourceType sourceType, Guid sourceId, CancellationToken ct)
    {
        switch (sourceType)
        {
            case FacilityPaymentSourceType.ServiceCharge:
                var charge = await _db.ServiceChargeCharges.FirstOrDefaultAsync(c => c.Id == sourceId, ct);
                if (charge is null) return Result.Failure<decimal>("Service charge not found.", "not_found");
                if (charge.Status is ServiceChargeStatus.Paid or ServiceChargeStatus.Cancelled)
                    return Result.Failure<decimal>("This service charge can no longer accept payments.", "already_settled");
                return Result.Success(charge.Amount - charge.PaidAmount);

            case FacilityPaymentSourceType.Parking:
                var allocation = await _db.ParkingAllocations.FirstOrDefaultAsync(a => a.Id == sourceId, ct);
                if (allocation is null) return Result.Failure<decimal>("Parking allocation not found.", "not_found");
                return Result.Success(allocation.Amount - allocation.PaidAmount);

            case FacilityPaymentSourceType.CoworkingMembership:
                var membership = await _db.Memberships.FirstOrDefaultAsync(m => m.Id == sourceId, ct);
                if (membership is null) return Result.Failure<decimal>("Membership not found.", "not_found");
                if (membership.Status == MembershipStatus.Cancelled)
                    return Result.Failure<decimal>("This membership has been cancelled and can no longer accept payments.", "already_settled");
                return Result.Success(membership.Amount - membership.PaidAmount);

            case FacilityPaymentSourceType.CoworkingBooking:
                var booking = await _db.CoworkingBookings.FirstOrDefaultAsync(b => b.Id == sourceId, ct);
                if (booking is null) return Result.Failure<decimal>("Booking not found.", "not_found");
                if (booking.Status == BookingStatus.Cancelled)
                    return Result.Failure<decimal>("This booking has been cancelled and can no longer accept payments.", "already_settled");
                return Result.Success(booking.Price - booking.PaidAmount);

            case FacilityPaymentSourceType.Utility:
                var reading = await _db.UtilityReadings.FirstOrDefaultAsync(r => r.Id == sourceId, ct);
                if (reading is null) return Result.Failure<decimal>("Utility reading not found.", "not_found");
                if (!reading.Amount.HasValue) return Result.Failure<decimal>("This utility reading has no billable amount.", "not_billable");
                return Result.Success(reading.Amount.Value - reading.PaidAmount);

            default:
                return Result.Failure<decimal>("Unknown source type.", "invalid_source");
        }
    }

    private async Task ApplyPaymentToSourceAsync(FacilityPaymentSourceType sourceType, Guid sourceId, decimal amount, CancellationToken ct)
    {
        switch (sourceType)
        {
            case FacilityPaymentSourceType.ServiceCharge:
                var charge = await _db.ServiceChargeCharges.FirstAsync(c => c.Id == sourceId, ct);
                charge.PaidAmount += amount;
                charge.Status = charge.PaidAmount >= charge.Amount - Tolerance ? ServiceChargeStatus.Paid : ServiceChargeStatus.PartiallyPaid;
                break;

            case FacilityPaymentSourceType.Parking:
                var allocation = await _db.ParkingAllocations.FirstAsync(a => a.Id == sourceId, ct);
                allocation.PaidAmount += amount;
                break;

            case FacilityPaymentSourceType.CoworkingMembership:
                var membership = await _db.Memberships.FirstAsync(m => m.Id == sourceId, ct);
                membership.PaidAmount += amount;
                break;

            case FacilityPaymentSourceType.CoworkingBooking:
                var booking = await _db.CoworkingBookings.FirstAsync(b => b.Id == sourceId, ct);
                booking.PaidAmount += amount;
                break;

            case FacilityPaymentSourceType.Utility:
                var reading = await _db.UtilityReadings.FirstAsync(r => r.Id == sourceId, ct);
                reading.PaidAmount += amount;
                break;
        }
    }

    private async Task<List<FacilityPaymentDto>> ToDtosAsync(IReadOnlyCollection<FacilityPayment> payments, CancellationToken ct)
    {
        var userIds = payments.Select(p => p.RecordedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var paymentIds = payments.Select(p => p.Id).ToList();
        var journalEntryIds = await _db.JournalEntries
            .Where(j => j.ReferenceType.StartsWith("Facility") && j.ReferenceId.HasValue && paymentIds.Contains(j.ReferenceId.Value))
            .ToDictionaryAsync(j => j.ReferenceId!.Value, j => j.Id, ct);

        return payments.Select(p => new FacilityPaymentDto(
            p.Id, p.ReceiptNumber, p.SourceType, p.SourceId, p.Amount, p.PaymentDate, p.Method, p.ReferenceNumber, p.Notes,
            p.RecordedByUserId, userNames.GetValueOrDefault(p.RecordedByUserId),
            journalEntryIds.TryGetValue(p.Id, out var journalEntryId) ? journalEntryId : null, p.CreatedAt)).ToList();
    }
}
