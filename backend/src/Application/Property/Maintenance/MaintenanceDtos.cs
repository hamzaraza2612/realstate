using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.Maintenance;

public record MaintenanceRequestDto(
    Guid Id,
    string RequestNumber,
    Guid PropertyId,
    string PropertyName,
    Guid? UnitId,
    string? UnitNumber,
    Guid? RentalTenantId,
    string? RentalTenantName,
    MaintenanceCategory Category,
    MaintenancePriority Priority,
    string Description,
    DateOnly ReportedDate,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    Guid? AssignedVendorId,
    string? AssignedVendorName,
    MaintenanceStatus Status,
    string? ResolutionNotes,
    DateOnly? CompletionDate,
    DateTimeOffset CreatedAt);

public record CreateMaintenanceRequestRequest(
    Guid PropertyId,
    Guid? UnitId,
    Guid? RentalTenantId,
    MaintenanceCategory Category,
    MaintenancePriority Priority,
    string Description,
    DateOnly ReportedDate,
    Guid? AssignedToUserId,
    Guid? AssignedVendorId);

public record AssignMaintenanceRequestRequest(Guid? AssignedToUserId, Guid? AssignedVendorId);

public record ChangeMaintenanceStatusRequest(MaintenanceStatus Status, string? ResolutionNotes, DateOnly? CompletionDate);

public record MaintenanceRequestFilter(Guid? PropertyId, Guid? UnitId, MaintenanceStatus? Status, MaintenancePriority? Priority, string? Search);
