using FluentValidation;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record DeskDto(Guid Id, Guid SpaceId, string SpaceCode, string Code, DeskType Type, DeskStatus Status);
public record CreateDeskRequest(Guid SpaceId, string Code, DeskType Type);
public record UpdateDeskRequest(string Code, DeskType Type, DeskStatus Status);
public record DeskFilter(Guid? SpaceId, DeskStatus? Status);

public interface IDeskService
{
    Task<PagedResult<DeskDto>> ListAsync(PagedRequest request, DeskFilter filter, CancellationToken ct = default);
    Task<Result<DeskDto>> CreateAsync(CreateDeskRequest request, CancellationToken ct = default);
    Task<Result<DeskDto>> UpdateAsync(Guid id, UpdateDeskRequest request, CancellationToken ct = default);
}

public class CreateDeskRequestValidator : AbstractValidator<CreateDeskRequest>
{
    public CreateDeskRequestValidator()
    {
        RuleFor(x => x.SpaceId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}
