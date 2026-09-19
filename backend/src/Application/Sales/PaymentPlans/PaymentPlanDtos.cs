using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Application.Sales.PaymentPlans;

public record InstallmentDto(
    Guid Id,
    Guid BookingId,
    Guid PaymentPlanId,
    int InstallmentNumber,
    string Label,
    DateOnly DueDate,
    decimal Amount,
    decimal PaidAmount,
    decimal RemainingAmount,
    InstallmentStatus Status,
    DateOnly? PaymentDate,
    string? Notes);

public record PaymentPlanDto(
    Guid Id,
    Guid BookingId,
    string Name,
    decimal BookingAmount,
    decimal DownPayment,
    PaymentPlanType PlanType,
    InstallmentFrequency Frequency,
    int NumberOfInstallments,
    int GracePeriodDays,
    decimal TotalScheduled,
    IReadOnlyList<InstallmentDto> Installments);

/// <summary>One entry in a custom schedule. Interpreted as an amount when the plan is FixedAmount, or a percentage of the remaining balance when Percentage.</summary>
public record InstallmentScheduleEntry(DateOnly DueDate, decimal Value);

public record CreatePaymentPlanRequest(
    string Name,
    decimal BookingAmount,
    decimal DownPayment,
    PaymentPlanType PlanType,
    InstallmentFrequency Frequency,
    int NumberOfInstallments,
    int GracePeriodDays,
    IReadOnlyList<InstallmentScheduleEntry>? CustomSchedule);
