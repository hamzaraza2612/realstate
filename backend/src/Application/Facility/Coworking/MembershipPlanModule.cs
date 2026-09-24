using FluentValidation;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record MembershipPlanDto(
    Guid Id, Guid FacilityId, string FacilityName, string Name, int DurationDays, decimal Price,
    decimal? IncludedHoursCredits, bool IsActive);

public record CreateMembershipPlanRequest(Guid FacilityId, string Name, int DurationDays, decimal Price, decimal? IncludedHoursCredits);
public record UpdateMembershipPlanRequest(string Name, decimal Price, decimal? IncludedHoursCredits, bool IsActive);
public record MembershipPlanFilter(Guid? FacilityId, bool? IsActive);

public interface IMembershipPlanService
{
    Task<PagedResult<MembershipPlanDto>> ListAsync(PagedRequest request, MembershipPlanFilter filter, CancellationToken ct = default);
    Task<Result<MembershipPlanDto>> CreateAsync(CreateMembershipPlanRequest request, CancellationToken ct = default);
    Task<Result<MembershipPlanDto>> UpdateAsync(Guid id, UpdateMembershipPlanRequest request, CancellationToken ct = default);
}

public class CreateMembershipPlanRequestValidator : AbstractValidator<CreateMembershipPlanRequest>
{
    public CreateMembershipPlanRequestValidator()
    {
        RuleFor(x => x.FacilityId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DurationDays).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}
