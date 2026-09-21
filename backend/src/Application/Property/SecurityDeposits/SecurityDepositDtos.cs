using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.SecurityDeposits;

public record SecurityDepositDto(
    Guid Id,
    Guid LeaseId,
    string LeaseNumber,
    decimal Amount,
    DateOnly? ReceivedDate,
    SecurityDepositStatus Status,
    decimal RefundedAmount,
    DateOnly? RefundDate,
    string? Notes);

public record ReceiveSecurityDepositRequest(DateOnly ReceivedDate, string? Notes);

public record RefundSecurityDepositRequest(decimal Amount, DateOnly RefundDate, string? Notes);

public record ForfeitSecurityDepositRequest(string? Notes);
