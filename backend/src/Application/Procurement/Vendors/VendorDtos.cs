namespace RealEstateErp.Application.Procurement.Vendors;

public record VendorDto(
    Guid Id,
    string Name,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? TaxRegistrationNumber,
    bool IsActive,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateVendorRequest(
    string Name,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? TaxRegistrationNumber,
    string? Notes);

public record UpdateVendorRequest(
    string Name,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? TaxRegistrationNumber,
    bool IsActive,
    string? Notes);

public record VendorFilter(bool? IsActive, string? Search);
