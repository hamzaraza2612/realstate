using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Application.Property.Payments;

public record RentPaymentDto(
    Guid Id,
    string ReceiptNumber,
    Guid LeaseId,
    string LeaseNumber,
    Guid RentScheduleId,
    int RentSchedulePeriodNumber,
    decimal Amount,
    DateOnly PaymentDate,
    PaymentMethod Method,
    string? ReferenceNumber,
    string? Notes,
    Guid RecordedByUserId,
    string? RecordedByUserName,
    Guid? JournalEntryId,
    DateTimeOffset CreatedAt);

public record RecordRentPaymentRequest(
    Guid RentScheduleId,
    decimal Amount,
    DateOnly PaymentDate,
    PaymentMethod Method,
    string? ReferenceNumber,
    string? Notes,
    string? IdempotencyKey);
