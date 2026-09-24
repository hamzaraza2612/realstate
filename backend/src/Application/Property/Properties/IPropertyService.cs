using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Properties;

public interface IPropertyService
{
    Task<PagedResult<PropertyDto>> ListAsync(PagedRequest request, PropertyFilter filter, CancellationToken ct = default);
    Task<Result<PropertyDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<PropertyDto>> CreateAsync(CreatePropertyRequest request, CancellationToken ct = default);
    Task<Result<PropertyDto>> UpdateAsync(Guid id, UpdatePropertyRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct = default);
}
