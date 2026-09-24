using FluentValidation;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record MembershipDto(
    Guid Id, Guid MemberId, string MemberName, Guid PlanId, string PlanName, DateOnly StartDate, DateOnly EndDate,
    MembershipStatus Status, decimal Amount, decimal PaidAmount, DateTimeOffset CreatedAt);

public record CreateMembershipRequest(Guid MemberId, Guid PlanId, DateOnly StartDate);
public record ChangeMembershipStatusRequest(MembershipStatus Status);
public record MembershipFilter(Guid? MemberId, Guid? PlanId, MembershipStatus? Status);

public interface IMembershipService
{
    Task<PagedResult<MembershipDto>> ListAsync(PagedRequest request, MembershipFilter filter, CancellationToken ct = default);
    Task<Result<MembershipDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<MembershipDto>> CreateAsync(CreateMembershipRequest request, CancellationToken ct = default);
    Task<Result<MembershipDto>> ChangeStatusAsync(Guid id, ChangeMembershipStatusRequest request, CancellationToken ct = default);
}

public class CreateMembershipRequestValidator : AbstractValidator<CreateMembershipRequest>
{
    public CreateMembershipRequestValidator()
    {
        RuleFor(x => x.MemberId).NotEmpty();
        RuleFor(x => x.PlanId).NotEmpty();
    }
}
