using FluentValidation;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Mall;

public record TenantNoticeDto(
    Guid Id, Guid FacilityId, string FacilityName, Guid? RentalTenantId, string? RentalTenantName,
    string Subject, string Content, DateOnly NoticeDate, TenantNoticeStatus Status);

public record CreateTenantNoticeRequest(Guid FacilityId, Guid? RentalTenantId, string Subject, string Content, DateOnly NoticeDate);

public record ChangeTenantNoticeStatusRequest(TenantNoticeStatus Status);

public record TenantNoticeFilter(Guid? FacilityId, Guid? RentalTenantId, TenantNoticeStatus? Status);

public interface ITenantNoticeService
{
    Task<PagedResult<TenantNoticeDto>> ListAsync(PagedRequest request, TenantNoticeFilter filter, CancellationToken ct = default);
    Task<Result<TenantNoticeDto>> CreateAsync(CreateTenantNoticeRequest request, CancellationToken ct = default);
    Task<Result<TenantNoticeDto>> ChangeStatusAsync(Guid id, ChangeTenantNoticeStatusRequest request, CancellationToken ct = default);
}

public class CreateTenantNoticeRequestValidator : AbstractValidator<CreateTenantNoticeRequest>
{
    public CreateTenantNoticeRequestValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty();
    }
}
