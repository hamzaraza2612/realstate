using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Sales;

public class PaymentService : IPaymentService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly ISalesPaymentPostingService _financePosting;

    public PaymentService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger, ISalesPaymentPostingService financePosting)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _financePosting = financePosting;
    }

    public async Task<Result<IReadOnlyList<PaymentDto>>> ListByBookingAsync(Guid bookingId, CancellationToken ct = default)
    {
        var bookingExists = await _db.Bookings.AnyAsync(b => b.Id == bookingId, ct);
        if (!bookingExists) return Result.Failure<IReadOnlyList<PaymentDto>>("Booking not found.", "not_found");

        var payments = await _db.Payments.Where(p => p.BookingId == bookingId).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<PaymentDto>>(await ToDtosAsync(payments, ct));
    }

    public async Task<Result<PaymentDto>> RecordAsync(Guid bookingId, RecordPaymentRequest request, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.Payments.FirstOrDefaultAsync(
                p => p.BookingId == bookingId && p.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return Result.Success((await ToDtosAsync(new[] { existing }, ct))[0]);
        }

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking is null) return Result.Failure<PaymentDto>("Booking not found.", "not_found");
        if (booking.Status == BookingStatus.Cancelled)
            return Result.Failure<PaymentDto>("Cannot record a payment against a cancelled booking.", "booking_cancelled");

        var installment = await _db.Installments.FirstOrDefaultAsync(i => i.Id == request.InstallmentId && i.BookingId == bookingId, ct);
        if (installment is null) return Result.Failure<PaymentDto>("Installment not found for this booking.", "not_found");
        if (installment.Status == InstallmentStatus.Cancelled)
            return Result.Failure<PaymentDto>("This installment has been cancelled and can no longer accept payments.", "installment_cancelled");
        if (installment.Status == InstallmentStatus.Paid)
            return Result.Failure<PaymentDto>("This installment is already fully paid.", "already_paid");

        var outstanding = installment.Amount - installment.PaidAmount;
        if (request.Amount > outstanding + Tolerance)
        {
            return Result.Failure<PaymentDto>(
                $"Payment of {request.Amount:0.00} exceeds the outstanding amount of {outstanding:0.00} for this installment.", "overpayment_not_allowed");
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.Payments.CountAsync(ct) + 1 + attempt;
            var payment = new Payment
            {
                ReceiptNumber = $"RCPT-{sequence:D6}",
                BookingId = bookingId,
                InstallmentId = installment.Id,
                Amount = request.Amount,
                PaymentDate = request.PaymentDate,
                Method = request.Method,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes,
                RecordedByUserId = _tenantContext.UserId ?? Guid.Empty,
                IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey
            };
            _db.Payments.Add(payment);

            installment.PaidAmount += request.Amount;
            installment.Status = installment.PaidAmount >= installment.Amount - Tolerance
                ? InstallmentStatus.Paid
                : InstallmentStatus.PartiallyPaid;
            if (installment.Status == InstallmentStatus.Paid) installment.PaymentDate = request.PaymentDate;

            var postingResult = await _financePosting.PostSalesPaymentAsync(
                payment.Id, booking.CustomerId, payment.Amount, payment.PaymentDate, payment.ReferenceNumber, ct);
            if (!postingResult.Succeeded)
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                return Result.Failure<PaymentDto>(postingResult.Error!, postingResult.ErrorCode!);
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Record", "Sales", "Payment", payment.Id.ToString(),
                    after: new { payment.ReceiptNumber, payment.BookingId, payment.InstallmentId, payment.Amount }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { payment }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                installment = await _db.Installments.FirstAsync(i => i.Id == request.InstallmentId, ct);
            }
        }

        return Result.Failure<PaymentDto>("Could not generate a unique receipt number, please retry.", "conflict");
    }

    private async Task<List<PaymentDto>> ToDtosAsync(IReadOnlyCollection<Payment> payments, CancellationToken ct)
    {
        var installmentIds = payments.Select(p => p.InstallmentId).Distinct().ToList();
        var installmentLabels = await _db.Installments.Where(i => installmentIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i.Label, ct);
        var userIds = payments.Select(p => p.RecordedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var paymentIds = payments.Select(p => p.Id).ToList();
        var journalEntryIds = await _db.JournalEntries
            .Where(j => j.ReferenceType == "SalesPayment" && j.ReferenceId.HasValue && paymentIds.Contains(j.ReferenceId.Value))
            .ToDictionaryAsync(j => j.ReferenceId!.Value, j => j.Id, ct);

        return payments.Select(p => new PaymentDto(
            p.Id, p.ReceiptNumber, p.BookingId, p.InstallmentId, installmentLabels.GetValueOrDefault(p.InstallmentId, ""),
            p.Amount, p.PaymentDate, p.Method, p.ReferenceNumber, p.Notes,
            p.RecordedByUserId, userNames.GetValueOrDefault(p.RecordedByUserId),
            journalEntryIds.TryGetValue(p.Id, out var journalEntryId) ? journalEntryId : null, p.CreatedAt)).ToList();
    }
}
