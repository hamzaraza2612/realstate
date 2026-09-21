using FluentValidation;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Mall;

public record FacilityEventDto(
    Guid Id, Guid FacilityId, string FacilityName, string Title, DateTimeOffset StartAt, DateTimeOffset EndAt,
    string? Location, string? Organizer, FacilityEventStatus Status, string? Notes);

public record CreateFacilityEventRequest(
    Guid FacilityId, string Title, DateTimeOffset StartAt, DateTimeOffset EndAt, string? Location, string? Organizer, string? Notes);

public record ChangeFacilityEventStatusRequest(FacilityEventStatus Status);

public record FacilityEventFilter(Guid? FacilityId, FacilityEventStatus? Status);

public interface IFacilityEventService
{
    Task<PagedResult<FacilityEventDto>> ListAsync(PagedRequest request, FacilityEventFilter filter, CancellationToken ct = default);
    Task<Result<FacilityEventDto>> CreateAsync(CreateFacilityEventRequest request, CancellationToken ct = default);
    Task<Result<FacilityEventDto>> ChangeStatusAsync(Guid id, ChangeFacilityEventStatusRequest request, CancellationToken ct = default);
}

public class CreateFacilityEventRequestValidator : AbstractValidator<CreateFacilityEventRequest>
{
    public CreateFacilityEventRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EndAt).GreaterThan(x => x.StartAt);
    }
}
