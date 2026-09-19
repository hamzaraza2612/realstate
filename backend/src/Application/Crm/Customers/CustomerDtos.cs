namespace RealEstateErp.Application.Crm.Customers;

public record CustomerDto(
    Guid Id,
    string FullName,
    string? Email,
    string? Phone,
    string? Address,
    string? CompanyName,
    Guid? ConvertedFromLeadId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateCustomerRequest(
    string FullName,
    string? Email,
    string? Phone,
    string? Address,
    string? CompanyName);

public record UpdateCustomerRequest(
    string FullName,
    string? Email,
    string? Phone,
    string? Address,
    string? CompanyName);

public record CustomerFilter(string? Search);
