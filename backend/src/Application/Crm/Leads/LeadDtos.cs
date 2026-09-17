using RealEstateErp.Domain.Crm;

namespace RealEstateErp.Application.Crm.Leads;

public record LeadDto(
    Guid Id,
    string FullName,
    string? Email,
    string? Phone,
    string? CompanyName,
    LeadSource Source,
    LeadStatus Status,
    LeadPriority Priority,
    string? Notes,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    Guid? ConvertedToCustomerId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateLeadRequest(
    string FullName,
    string? Email,
    string? Phone,
    string? CompanyName,
    LeadSource Source,
    LeadPriority Priority,
    string? Notes,
    Guid? AssignedToUserId);

public record UpdateLeadRequest(
    string FullName,
    string? Email,
    string? Phone,
    string? CompanyName,
    LeadStatus Status,
    LeadPriority Priority,
    string? Notes);

public record AssignLeadRequest(Guid? AssignedToUserId);

public record LeadFilter(
    LeadStatus? Status,
    LeadPriority? Priority,
    LeadSource? Source,
    Guid? AssignedToUserId,
    bool? UnassignedOnly,
    string? Search);
