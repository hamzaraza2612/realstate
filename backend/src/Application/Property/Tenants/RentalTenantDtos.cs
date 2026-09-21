namespace RealEstateErp.Application.Property.Tenants;

public record RentalTenantDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string? Email,
    string? Phone,
    string? Address,
    bool IsCompany,
    string? IdentificationNumber,
    bool IsActive,
    string? Notes,
    int ActiveLeaseCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

/// <summary>Creates the underlying Customer record too (name/email/phone/address) in the same request —
/// callers don't need to create a Customer separately first, though an existing CustomerId may be
/// supplied instead to attach the rental overlay to an already-known customer/lead conversion.</summary>
public record CreateRentalTenantRequest(
    Guid? CustomerId,
    string? FullName,
    string? Email,
    string? Phone,
    string? Address,
    bool IsCompany,
    string? IdentificationNumber,
    string? Notes);

public record UpdateRentalTenantRequest(
    string? Email,
    string? Phone,
    string? Address,
    bool IsCompany,
    string? IdentificationNumber,
    bool IsActive,
    string? Notes);

public record RentalTenantFilter(bool? IsActive, string? Search);
