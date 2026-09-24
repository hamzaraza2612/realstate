using FluentValidation;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Spaces;

public record SpaceDto(
    Guid Id,
    Guid FacilityId,
    string FacilityName,
    Guid? PropertyUnitId,
    string? BuildingBlock,
    string Code,
    SpaceType Type,
    decimal? AreaSize,
    int? Capacity,
    SpaceStatus Status,
    decimal? Rate,
    string? MetadataJson,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateSpaceRequest(
    Guid FacilityId, Guid? PropertyUnitId, string? BuildingBlock, string Code, SpaceType Type,
    decimal? AreaSize, int? Capacity, decimal? Rate, string? MetadataJson);

public record UpdateSpaceRequest(
    string? BuildingBlock, string Code, SpaceType Type, decimal? AreaSize, int? Capacity,
    decimal? Rate, string? MetadataJson);

public record ChangeSpaceStatusRequest(SpaceStatus Status);

public record SpaceFilter(Guid? FacilityId, SpaceType? Type, SpaceStatus? Status, string? Search);

public interface ISpaceService
{
    Task<PagedResult<SpaceDto>> ListAsync(PagedRequest request, SpaceFilter filter, CancellationToken ct = default);
    Task<Result<SpaceDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<SpaceDto>> CreateAsync(CreateSpaceRequest request, CancellationToken ct = default);
    Task<Result<SpaceDto>> UpdateAsync(Guid id, UpdateSpaceRequest request, CancellationToken ct = default);
    Task<Result<SpaceDto>> ChangeStatusAsync(Guid id, ChangeSpaceStatusRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}

public class CreateSpaceRequestValidator : AbstractValidator<CreateSpaceRequest>
{
    public CreateSpaceRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.FacilityId).NotEmpty();
    }
}

public class UpdateSpaceRequestValidator : AbstractValidator<UpdateSpaceRequest>
{
    public UpdateSpaceRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}
