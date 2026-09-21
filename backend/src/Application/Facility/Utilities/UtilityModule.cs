using FluentValidation;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Utilities;

public record UtilityReadingDto(
    Guid Id, Guid? FacilityId, string? FacilityName, Guid? PropertyId, string? PropertyName,
    UtilityType Type, string MeterReference, decimal ReadingValue, DateOnly ReadingDate,
    decimal Consumption, decimal? RatePerUnit, decimal? Amount, decimal PaidAmount, DateTimeOffset CreatedAt);

public record CreateUtilityReadingRequest(
    Guid? FacilityId, Guid? PropertyId, UtilityType Type, string MeterReference,
    decimal ReadingValue, DateOnly ReadingDate, decimal? RatePerUnit);

public record UtilityReadingFilter(Guid? FacilityId, Guid? PropertyId, UtilityType? Type, string? MeterReference);

public interface IUtilityReadingService
{
    Task<PagedResult<UtilityReadingDto>> ListAsync(PagedRequest request, UtilityReadingFilter filter, CancellationToken ct = default);
    Task<Result<UtilityReadingDto>> CreateAsync(CreateUtilityReadingRequest request, CancellationToken ct = default);
}

public class CreateUtilityReadingRequestValidator : AbstractValidator<CreateUtilityReadingRequest>
{
    public CreateUtilityReadingRequestValidator()
    {
        RuleFor(x => x.MeterReference).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ReadingValue).GreaterThanOrEqualTo(0);
        RuleFor(x => x).Must(x => x.FacilityId.HasValue || x.PropertyId.HasValue)
            .WithMessage("Either a facility or a property must be specified.");
    }
}
