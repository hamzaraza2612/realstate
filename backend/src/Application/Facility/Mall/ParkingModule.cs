using FluentValidation;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Mall;

public record ParkingSpaceDto(Guid Id, Guid FacilityId, string Code, ParkingSpaceStatus Status);
public record CreateParkingSpaceRequest(Guid FacilityId, string Code);

public record ParkingAllocationDto(
    Guid Id, Guid ParkingSpaceId, string ParkingSpaceCode, Guid? RentalTenantId, string? RentalTenantName,
    string? VehicleReference, DateOnly StartDate, DateOnly? EndDate, decimal Amount, decimal PaidAmount,
    ParkingAllocationStatus Status, string? Notes);

public record CreateParkingAllocationRequest(
    Guid ParkingSpaceId, Guid? RentalTenantId, string? VehicleReference, DateOnly StartDate, decimal Amount, string? Notes);

public record ParkingSpaceFilter(Guid? FacilityId, ParkingSpaceStatus? Status);
public record ParkingAllocationFilter(Guid? ParkingSpaceId, ParkingAllocationStatus? Status);

public interface IParkingService
{
    Task<PagedResult<ParkingSpaceDto>> ListSpacesAsync(PagedRequest request, ParkingSpaceFilter filter, CancellationToken ct = default);
    Task<Result<ParkingSpaceDto>> CreateSpaceAsync(CreateParkingSpaceRequest request, CancellationToken ct = default);
    Task<PagedResult<ParkingAllocationDto>> ListAllocationsAsync(PagedRequest request, ParkingAllocationFilter filter, CancellationToken ct = default);
    Task<Result<ParkingAllocationDto>> AllocateAsync(CreateParkingAllocationRequest request, CancellationToken ct = default);
    Task<Result<ParkingAllocationDto>> EndAsync(Guid allocationId, CancellationToken ct = default);
}

public class CreateParkingSpaceRequestValidator : AbstractValidator<CreateParkingSpaceRequest>
{
    public CreateParkingSpaceRequestValidator()
    {
        RuleFor(x => x.FacilityId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}

public class CreateParkingAllocationRequestValidator : AbstractValidator<CreateParkingAllocationRequest>
{
    public CreateParkingAllocationRequestValidator()
    {
        RuleFor(x => x.ParkingSpaceId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0);
    }
}
