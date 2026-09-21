using FluentValidation;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record BookingDto(
    Guid Id, Guid MemberId, string MemberName, BookingResourceType ResourceType, Guid ResourceId, string ResourceLabel,
    DateTimeOffset StartAt, DateTimeOffset EndAt, BookingStatus Status, decimal Price, decimal PaidAmount, string? Notes,
    DateTimeOffset CreatedAt);

public record CreateBookingRequest(Guid MemberId, BookingResourceType ResourceType, Guid ResourceId, DateTimeOffset StartAt, DateTimeOffset EndAt, string? Notes);
public record ChangeBookingStatusRequest(BookingStatus Status);
public record BookingFilter(Guid? MemberId, BookingResourceType? ResourceType, Guid? ResourceId, BookingStatus? Status);

public interface IBookingService
{
    Task<PagedResult<BookingDto>> ListAsync(PagedRequest request, BookingFilter filter, CancellationToken ct = default);
    Task<Result<BookingDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct = default);
    Task<Result<BookingDto>> ChangeStatusAsync(Guid id, ChangeBookingStatusRequest request, CancellationToken ct = default);
}

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.MemberId).NotEmpty();
        RuleFor(x => x.ResourceId).NotEmpty();
        RuleFor(x => x.EndAt).GreaterThan(x => x.StartAt);
    }
}
