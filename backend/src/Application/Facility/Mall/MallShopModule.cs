using FluentValidation;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Mall;

/// <summary>A read-friendly join of Space + MallShopProfile + the shop's current (if any) Property.Lease —
/// mall shop assignment reuses the existing Lease/RentalTenant workflow unchanged; this DTO just surfaces
/// that state alongside the mall-specific descriptive fields for a mall tenant-management screen. Creating
/// a lease for a shop is done via the existing POST /api/v1/property/leases (unitId = this shop's
/// propertyUnitId), not a mall-specific endpoint.</summary>
public record MallShopDto(
    Guid SpaceId, Guid FacilityId, string FacilityName, Guid PropertyUnitId, string? BuildingBlock, string Code,
    decimal? AreaSize, decimal? Rate, SpaceStatus Status, string? TradeCategory, string? StorefrontName, string? Notes,
    Guid? CurrentLeaseId, LeaseStatus? CurrentLeaseStatus, string? CurrentTenantName);

/// <summary>Creates the underlying PropertyUnit (under the facility's Property) and Space together —
/// callers don't create a PropertyUnit separately first.</summary>
public record CreateMallShopRequest(
    Guid FacilityId, string? BuildingBlock, string Code, decimal? AreaSize, decimal? Rate,
    string? TradeCategory, string? StorefrontName, string? Notes);

public record UpdateMallShopRequest(string? TradeCategory, string? StorefrontName, string? Notes);

public record MallShopFilter(Guid? FacilityId, SpaceStatus? Status, string? Search);

public interface IMallShopService
{
    Task<PagedResult<MallShopDto>> ListAsync(PagedRequest request, MallShopFilter filter, CancellationToken ct = default);
    Task<Result<MallShopDto>> GetAsync(Guid spaceId, CancellationToken ct = default);
    Task<Result<MallShopDto>> CreateAsync(CreateMallShopRequest request, CancellationToken ct = default);
    Task<Result<MallShopDto>> UpdateAsync(Guid spaceId, UpdateMallShopRequest request, CancellationToken ct = default);
}

public class CreateMallShopRequestValidator : AbstractValidator<CreateMallShopRequest>
{
    public CreateMallShopRequestValidator()
    {
        RuleFor(x => x.FacilityId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}
