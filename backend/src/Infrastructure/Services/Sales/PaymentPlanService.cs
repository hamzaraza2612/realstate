using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Sales;

public class PaymentPlanService : IPaymentPlanService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public PaymentPlanService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<Result<PaymentPlanDto>> GetByBookingAsync(Guid bookingId, CancellationToken ct = default)
    {
        var plan = await _db.PaymentPlans.FirstOrDefaultAsync(p => p.BookingId == bookingId, ct);
        if (plan is null) return Result.Failure<PaymentPlanDto>("This booking has no payment plan yet.", "not_found");

        var installments = await _db.Installments
            .Where(i => i.PaymentPlanId == plan.Id)
            .OrderBy(i => i.InstallmentNumber)
            .ToListAsync(ct);

        return Result.Success(ToDto(plan, installments));
    }

    public async Task<Result<PaymentPlanDto>> CreateAsync(Guid bookingId, CreatePaymentPlanRequest request, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking is null) return Result.Failure<PaymentPlanDto>("Booking not found.", "not_found");

        var exists = await _db.PaymentPlans.AnyAsync(p => p.BookingId == bookingId, ct);
        if (exists) return Result.Failure<PaymentPlanDto>("This booking already has a payment plan.", "conflict");

        var remaining = booking.NetPrice - request.BookingAmount - request.DownPayment;
        if (remaining < -Tolerance)
            return Result.Failure<PaymentPlanDto>("Booking amount and down payment exceed the booking's net price.", "invalid_amounts");
        remaining = Math.Max(remaining, 0);

        List<(DateOnly DueDate, decimal Amount)> periodic;
        if (request.CustomSchedule is { Count: > 0 })
        {
            var reconciled = ReconcileCustomSchedule(request.CustomSchedule, request.PlanType, remaining);
            if (!reconciled.Succeeded) return Result.Failure<PaymentPlanDto>(reconciled.Error!, reconciled.ErrorCode!);
            periodic = reconciled.Value!;
        }
        else
        {
            periodic = GenerateEvenSchedule(booking.BookingDate, request.Frequency, request.NumberOfInstallments, remaining);
        }

        var installments = new List<Installment>();
        var number = 1;
        if (request.BookingAmount > 0)
        {
            installments.Add(new Installment
            {
                InstallmentNumber = number++,
                Label = "Booking Amount",
                DueDate = booking.BookingDate,
                Amount = request.BookingAmount,
                Status = InstallmentStatus.Pending
            });
        }
        if (request.DownPayment > 0)
        {
            installments.Add(new Installment
            {
                InstallmentNumber = number++,
                Label = "Down Payment",
                DueDate = booking.BookingDate,
                Amount = request.DownPayment,
                Status = InstallmentStatus.Pending
            });
        }
        for (var i = 0; i < periodic.Count; i++)
        {
            installments.Add(new Installment
            {
                InstallmentNumber = number++,
                Label = $"Installment {i + 1}",
                DueDate = periodic[i].DueDate,
                Amount = periodic[i].Amount,
                Status = InstallmentStatus.Pending
            });
        }

        var totalScheduled = installments.Sum(i => i.Amount);
        if (Math.Abs(totalScheduled - booking.NetPrice) > Tolerance)
        {
            return Result.Failure<PaymentPlanDto>(
                $"The generated schedule ({totalScheduled:0.00}) does not reconcile with the booking's net price ({booking.NetPrice:0.00}).", "schedule_mismatch");
        }

        var plan = new PaymentPlan
        {
            BookingId = bookingId,
            Name = request.Name,
            BookingAmount = request.BookingAmount,
            DownPayment = request.DownPayment,
            PlanType = request.PlanType,
            Frequency = request.Frequency,
            NumberOfInstallments = periodic.Count,
            GracePeriodDays = request.GracePeriodDays
        };

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        _db.PaymentPlans.Add(plan);
        foreach (var installment in installments)
        {
            installment.PaymentPlanId = plan.Id;
            installment.BookingId = bookingId;
        }
        _db.Installments.AddRange(installments);
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _auditLogger.LogAsync("Create", "Sales", "PaymentPlan", plan.Id.ToString(),
            after: new { plan.BookingId, plan.Name, InstallmentCount = installments.Count, TotalScheduled = totalScheduled }, ct: ct);

        return Result.Success(ToDto(plan, installments));
    }

    private static Result<List<(DateOnly DueDate, decimal Amount)>> ReconcileCustomSchedule(
        IReadOnlyList<InstallmentScheduleEntry> entries, PaymentPlanType planType, decimal remaining)
    {
        if (planType == PaymentPlanType.Percentage)
        {
            var totalPercent = entries.Sum(e => e.Value);
            if (Math.Abs(totalPercent - 100m) > Tolerance)
                return Result.Failure<List<(DateOnly, decimal)>>("Custom schedule percentages must add up to 100.", "schedule_mismatch");

            var amounts = entries.Select(e => Math.Round(remaining * e.Value / 100m, 2)).ToList();
            SnapLastToRemaining(amounts, remaining);
            return Result.Success(entries.Select((e, i) => (e.DueDate, amounts[i])).ToList());
        }

        var totalAmount = entries.Sum(e => e.Value);
        if (Math.Abs(totalAmount - remaining) > Tolerance)
            return Result.Failure<List<(DateOnly, decimal)>>(
                $"The custom schedule ({totalAmount:0.00}) does not reconcile with the remaining balance ({remaining:0.00}).", "schedule_mismatch");

        var exact = entries.Select(e => e.Value).ToList();
        SnapLastToRemaining(exact, remaining);
        return Result.Success(entries.Select((e, i) => (e.DueDate, exact[i])).ToList());
    }

    private static List<(DateOnly DueDate, decimal Amount)> GenerateEvenSchedule(
        DateOnly bookingDate, InstallmentFrequency frequency, int count, decimal remaining)
    {
        if (count <= 0 || remaining <= 0) return new List<(DateOnly, decimal)>();

        var baseAmount = Math.Round(remaining / count, 2);
        var amounts = Enumerable.Repeat(baseAmount, count).ToList();
        SnapLastToRemaining(amounts, remaining);

        var schedule = new List<(DateOnly, decimal)>();
        for (var i = 1; i <= count; i++)
        {
            schedule.Add((AddPeriod(bookingDate, frequency, i), amounts[i - 1]));
        }
        return schedule;
    }

    /// <summary>Rounding to 2dp on each entry can leave the sum a cent or two off the target — the last entry absorbs the difference so the total always reconciles exactly.</summary>
    private static void SnapLastToRemaining(List<decimal> amounts, decimal target)
    {
        if (amounts.Count == 0) return;
        var sum = amounts.Sum();
        amounts[^1] += target - sum;
    }

    private static DateOnly AddPeriod(DateOnly date, InstallmentFrequency frequency, int periods) => frequency switch
    {
        InstallmentFrequency.Monthly => date.AddMonths(periods),
        InstallmentFrequency.Quarterly => date.AddMonths(periods * 3),
        InstallmentFrequency.SemiAnnually => date.AddMonths(periods * 6),
        InstallmentFrequency.Annually => date.AddYears(periods),
        _ => date.AddMonths(periods)
    };

    public static InstallmentStatus EffectiveStatus(Installment installment, int gracePeriodDays)
    {
        if (installment.Status is InstallmentStatus.Pending or InstallmentStatus.PartiallyPaid)
        {
            var graceDeadline = installment.DueDate.AddDays(gracePeriodDays);
            if (graceDeadline < DateOnly.FromDateTime(DateTime.UtcNow)) return InstallmentStatus.Overdue;
        }
        return installment.Status;
    }

    private static PaymentPlanDto ToDto(PaymentPlan plan, IReadOnlyList<Installment> installments)
    {
        var installmentDtos = installments.Select(i => new InstallmentDto(
            i.Id, i.BookingId, i.PaymentPlanId, i.InstallmentNumber, i.Label, i.DueDate, i.Amount, i.PaidAmount,
            i.Amount - i.PaidAmount, EffectiveStatus(i, plan.GracePeriodDays), i.PaymentDate, i.Notes)).ToList();

        return new PaymentPlanDto(
            plan.Id, plan.BookingId, plan.Name, plan.BookingAmount, plan.DownPayment, plan.PlanType,
            plan.Frequency, plan.NumberOfInstallments, plan.GracePeriodDays,
            installments.Sum(i => i.Amount), installmentDtos);
    }
}
