using FluentValidation;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;
using DomainServiceRequestCategory = RealEstateErp.Domain.Facility.ServiceRequestCategory;

namespace RealEstateErp.Application.Facility.ServiceRequests;

public record ServiceRequestDto(
    Guid Id, string RequestNumber, Guid FacilityId, string FacilityName, Guid? SpaceId, string? SpaceCode,
    Guid? RequestedByUserId, string? RequestedByUserName, Guid? RequesterCustomerId, string? RequesterCustomerName,
    DomainServiceRequestCategory Category, MaintenancePriority Priority, string Description, DateOnly ReportedDate,
    Guid? AssignedToUserId, string? AssignedToUserName, Guid? AssignedVendorId, string? AssignedVendorName,
    MaintenanceStatus Status, string? ResolutionNotes, DateOnly? ResolvedDate, DateTimeOffset CreatedAt);

public record CreateServiceRequestRequest(
    Guid FacilityId, Guid? SpaceId, Guid? RequesterCustomerId, DomainServiceRequestCategory Category,
    MaintenancePriority Priority, string Description, DateOnly ReportedDate, Guid? AssignedToUserId, Guid? AssignedVendorId);

public record ChangeServiceRequestStatusRequest(MaintenanceStatus Status, string? ResolutionNotes);

public record ServiceRequestFilter(Guid? FacilityId, Guid? SpaceId, MaintenanceStatus? Status, MaintenancePriority? Priority, string? Search);

public interface IServiceRequestService
{
    Task<PagedResult<ServiceRequestDto>> ListAsync(PagedRequest request, ServiceRequestFilter filter, CancellationToken ct = default);
    Task<Result<ServiceRequestDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<ServiceRequestDto>> CreateAsync(CreateServiceRequestRequest request, CancellationToken ct = default);
    Task<Result<ServiceRequestDto>> ChangeStatusAsync(Guid id, ChangeServiceRequestStatusRequest request, CancellationToken ct = default);
}

public class CreateServiceRequestRequestValidator : AbstractValidator<CreateServiceRequestRequest>
{
    public CreateServiceRequestRequestValidator()
    {
        RuleFor(x => x.FacilityId).NotEmpty();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
    }
}
