using FluentValidation;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Property.Owners;

public record PropertyOwnerDto(Guid Id, string FullName, string? Email, string? Phone, string? Notes, bool IsActive, int PropertyCount);

public record CreatePropertyOwnerRequest(string FullName, string? Email, string? Phone, string? Notes);
public record UpdatePropertyOwnerRequest(string FullName, string? Email, string? Phone, string? Notes, bool IsActive);
public record PropertyOwnerFilter(bool? IsActive, string? Search);

public interface IPropertyOwnerService
{
    Task<PagedResult<PropertyOwnerDto>> ListAsync(PagedRequest request, PropertyOwnerFilter filter, CancellationToken ct = default);
    Task<RealEstateErp.Shared.Common.Result<PropertyOwnerDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<RealEstateErp.Shared.Common.Result<PropertyOwnerDto>> CreateAsync(CreatePropertyOwnerRequest request, CancellationToken ct = default);
    Task<RealEstateErp.Shared.Common.Result<PropertyOwnerDto>> UpdateAsync(Guid id, UpdatePropertyOwnerRequest request, CancellationToken ct = default);

    /// <summary>Links (or unlinks, when ownerId is null) a Property to a PropertyOwner — a property has
    /// at most one linked owner in this milestone, not a co-ownership model.</summary>
    Task<RealEstateErp.Shared.Common.Result> LinkPropertyAsync(Guid propertyId, Guid? ownerId, CancellationToken ct = default);
}

public class CreatePropertyOwnerRequestValidator : AbstractValidator<CreatePropertyOwnerRequest>
{
    public CreatePropertyOwnerRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public class UpdatePropertyOwnerRequestValidator : AbstractValidator<UpdatePropertyOwnerRequest>
{
    public UpdatePropertyOwnerRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}
