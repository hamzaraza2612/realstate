using FluentValidation;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Facility.Payments;

public record FacilityPaymentDto(
    Guid Id, string ReceiptNumber, FacilityPaymentSourceType SourceType, Guid SourceId,
    decimal Amount, DateOnly PaymentDate, PaymentMethod Method, string? ReferenceNumber, string? Notes,
    Guid RecordedByUserId, string? RecordedByUserName, Guid? JournalEntryId, DateTimeOffset CreatedAt);

public record RecordFacilityPaymentRequest(
    FacilityPaymentSourceType SourceType, Guid SourceId, decimal Amount, DateOnly PaymentDate,
    PaymentMethod Method, string? ReferenceNumber, string? Notes, string? IdempotencyKey);

public interface IFacilityPaymentService
{
    Task<Result<IReadOnlyList<FacilityPaymentDto>>> ListBySourceAsync(FacilityPaymentSourceType sourceType, Guid sourceId, CancellationToken ct = default);
    Task<Result<FacilityPaymentDto>> RecordAsync(RecordFacilityPaymentRequest request, CancellationToken ct = default);
}

public class RecordFacilityPaymentRequestValidator : AbstractValidator<RecordFacilityPaymentRequest>
{
    public RecordFacilityPaymentRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.SourceId).NotEmpty();
    }
}
