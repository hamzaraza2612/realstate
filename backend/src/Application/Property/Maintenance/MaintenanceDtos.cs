using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.Maintenance;

public record MaintenanceRequestDto(
    Guid Id,
    string RequestNumber,
    Guid PropertyId,
    string PropertyName,
    Guid? UnitId,
    string? UnitNumber,
    Guid? FacilityId,
    string? FacilityName,
    Guid? SpaceId,
    string? SpaceCode,
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
    int? SlaHours,
    DateTimeOffset? SlaDueAt,
    DateTimeOffset CreatedAt);

/// <summary>Exactly one of PropertyId/FacilityId must be given; when FacilityId is given, PropertyId is
/// derived from Facility.PropertyId server-side (Facility Management reuses this infrastructure rather
/// than duplicating it — see MaintenanceRequest.FacilityId/SpaceId).</summary>
public record CreateMaintenanceRequestRequest(
    Guid? PropertyId,
    Guid? UnitId,
    Guid? FacilityId,
    Guid? SpaceId,
    Guid? RentalTenantId,
    MaintenanceCategory Category,
    MaintenancePriority Priority,
    string Description,
    DateOnly ReportedDate,
    Guid? AssignedToUserId,
    Guid? AssignedVendorId,
    int? SlaHours);

public record AssignMaintenanceRequestRequest(Guid? AssignedToUserId, Guid? AssignedVendorId);

public record ChangeMaintenanceStatusRequest(MaintenanceStatus Status, string? ResolutionNotes, DateOnly? CompletionDate);

public record MaintenanceRequestFilter(Guid? PropertyId, Guid? UnitId, MaintenanceStatus? Status, MaintenancePriority? Priority, string? Search);
