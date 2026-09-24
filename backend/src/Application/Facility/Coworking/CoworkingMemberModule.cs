using FluentValidation;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record CoworkingMemberDto(
    Guid Id, Guid CustomerId, string CustomerName, string? Email, string? Phone, bool IsActive,
    string? Notes, int ActiveMembershipCount, DateTimeOffset CreatedAt);

public record CreateCoworkingMemberRequest(Guid? CustomerId, string? FullName, string? Email, string? Phone, string? Notes);
public record UpdateCoworkingMemberRequest(bool IsActive, string? Notes);
public record CoworkingMemberFilter(bool? IsActive, string? Search);

public interface ICoworkingMemberService
{
    Task<PagedResult<CoworkingMemberDto>> ListAsync(PagedRequest request, CoworkingMemberFilter filter, CancellationToken ct = default);
    Task<Result<CoworkingMemberDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<CoworkingMemberDto>> CreateAsync(CreateCoworkingMemberRequest request, CancellationToken ct = default);
    Task<Result<CoworkingMemberDto>> UpdateAsync(Guid id, UpdateCoworkingMemberRequest request, CancellationToken ct = default);
}

public class CreateCoworkingMemberRequestValidator : AbstractValidator<CreateCoworkingMemberRequest>
{
    public CreateCoworkingMemberRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotNull().When(x => string.IsNullOrWhiteSpace(x.FullName));
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200).When(x => x.CustomerId is null);
    }
}
