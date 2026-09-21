using FluentValidation;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Facilities;

public record FacilityDto(
    Guid Id,
    string Code,
    Guid PropertyId,
    string PropertyName,
    FacilityType Type,
    string Name,
    FacilityOperatingStatus Status,
    string? Description,
    string? AddressLine,
    string? City,
    Guid? ManagerUserId,
    string? ManagerUserName,
    int SpaceCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateFacilityRequest(
    string Code, Guid PropertyId, FacilityType Type, string Name, string? Description,
    string? AddressLine, string? City, Guid? ManagerUserId);

public record UpdateFacilityRequest(
    string Name, FacilityOperatingStatus Status, string? Description,
    string? AddressLine, string? City, Guid? ManagerUserId);

public record FacilityFilter(FacilityType? Type, FacilityOperatingStatus? Status, string? Search);

public interface IFacilityService
{
    Task<PagedResult<FacilityDto>> ListAsync(PagedRequest request, FacilityFilter filter, CancellationToken ct = default);
    Task<Result<FacilityDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<FacilityDto>> CreateAsync(CreateFacilityRequest request, CancellationToken ct = default);
    Task<Result<FacilityDto>> UpdateAsync(Guid id, UpdateFacilityRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}

public class CreateFacilityRequestValidator : AbstractValidator<CreateFacilityRequest>
{
    public CreateFacilityRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PropertyId).NotEmpty();
    }
}

public class UpdateFacilityRequestValidator : AbstractValidator<UpdateFacilityRequest>
{
    public UpdateFacilityRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}
