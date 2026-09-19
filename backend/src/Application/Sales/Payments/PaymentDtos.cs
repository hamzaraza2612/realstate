using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Application.Sales.Payments;

public record PaymentDto(
    Guid Id,
    string ReceiptNumber,
    Guid BookingId,
    Guid InstallmentId,
    string InstallmentLabel,
    decimal Amount,
    DateOnly PaymentDate,
    PaymentMethod Method,
    string? ReferenceNumber,
    string? Notes,
    Guid RecordedByUserId,
    string? RecordedByUserName,
    Guid? JournalEntryId,
    DateTimeOffset CreatedAt);

public record RecordPaymentRequest(
    Guid InstallmentId,
    decimal Amount,
    DateOnly PaymentDate,
    PaymentMethod Method,
    string? ReferenceNumber,
    string? Notes,
    string? IdempotencyKey = null);
