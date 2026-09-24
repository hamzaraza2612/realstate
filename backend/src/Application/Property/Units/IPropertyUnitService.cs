using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Units;

public interface IPropertyUnitService
{
    Task<PagedResult<PropertyUnitDto>> ListAsync(PagedRequest request, PropertyUnitFilter filter, CancellationToken ct = default);
    Task<Result<PropertyUnitDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<PropertyUnitDto>> CreateAsync(CreatePropertyUnitRequest request, CancellationToken ct = default);
    Task<Result<PropertyUnitDto>> UpdateAsync(Guid id, UpdatePropertyUnitRequest request, CancellationToken ct = default);
    Task<Result<PropertyUnitDto>> ChangeStatusAsync(Guid id, ChangePropertyUnitStatusRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
