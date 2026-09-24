using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.RentSchedules;

/// <summary>Status is the persisted value; IsOverdue is computed at read time from DueDate + the
/// lease's GracePeriodDays vs. today, mirroring Sales.InstallmentDto's Overdue convention.</summary>
public record RentScheduleDto(
    Guid Id,
    Guid LeaseId,
    string LeaseNumber,
    int PeriodNumber,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    DateOnly DueDate,
    decimal Amount,
    decimal PaidAmount,
    RentScheduleStatus Status,
    bool IsOverdue);

public record RentScheduleFilter(Guid? LeaseId, RentScheduleStatus? Status, bool? OverdueOnly);
