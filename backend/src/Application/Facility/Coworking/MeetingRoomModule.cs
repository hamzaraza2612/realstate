using FluentValidation;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Coworking;

public record MeetingRoomDto(Guid Id, Guid SpaceId, string SpaceCode, string Name, int Capacity, decimal? HourlyRate, decimal? DailyRate, MeetingRoomStatus Status);
public record CreateMeetingRoomRequest(Guid SpaceId, string Name, int Capacity, decimal? HourlyRate, decimal? DailyRate);
public record UpdateMeetingRoomRequest(string Name, int Capacity, decimal? HourlyRate, decimal? DailyRate, MeetingRoomStatus Status);
public record MeetingRoomFilter(Guid? SpaceId, MeetingRoomStatus? Status);

public interface IMeetingRoomService
{
    Task<PagedResult<MeetingRoomDto>> ListAsync(PagedRequest request, MeetingRoomFilter filter, CancellationToken ct = default);
    Task<Result<MeetingRoomDto>> CreateAsync(CreateMeetingRoomRequest request, CancellationToken ct = default);
    Task<Result<MeetingRoomDto>> UpdateAsync(Guid id, UpdateMeetingRoomRequest request, CancellationToken ct = default);
}

public class CreateMeetingRoomRequestValidator : AbstractValidator<CreateMeetingRoomRequest>
{
    public CreateMeetingRoomRequestValidator()
    {
        RuleFor(x => x.SpaceId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Capacity).GreaterThan(0);
    }
}
