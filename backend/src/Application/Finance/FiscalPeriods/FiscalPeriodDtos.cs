using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Application.Finance.FiscalPeriods;

public record FiscalPeriodDto(
    Guid Id,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    FiscalPeriodStatus Status,
    DateTimeOffset? ClosedAt,
    Guid? ClosedByUserId,
    string? ClosedByUserName,
    DateTimeOffset CreatedAt);

public record CreateFiscalPeriodRequest(string Name, DateOnly StartDate, DateOnly EndDate);
