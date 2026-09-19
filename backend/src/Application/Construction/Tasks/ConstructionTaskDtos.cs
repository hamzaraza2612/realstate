using RealEstateErp.Domain.Construction;

namespace RealEstateErp.Application.Construction.Tasks;

public record ConstructionTaskDto(
    Guid Id,
    Guid WorkPackageId,
    string WorkPackageName,
    string Title,
    string? Description,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    ConstructionTaskPriority Priority,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualStartDate,
    DateOnly? ActualEndDate,
    ConstructionTaskStatus Status,
    int ProgressPercent,
    Guid? DependsOnTaskId,
    string? DependsOnTaskTitle,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateConstructionTaskRequest(
    Guid WorkPackageId,
    string Title,
    string? Description,
    Guid? AssignedToUserId,
    ConstructionTaskPriority Priority,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    Guid? DependsOnTaskId);

public record UpdateConstructionTaskRequest(
    string Title,
    string? Description,
    Guid? AssignedToUserId,
    ConstructionTaskPriority Priority,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualStartDate,
    DateOnly? ActualEndDate,
    int ProgressPercent);

public record ChangeConstructionTaskStatusRequest(ConstructionTaskStatus Status);

public record ConstructionTaskFilter(Guid? WorkPackageId, Guid? AssignedToUserId, ConstructionTaskStatus? Status, bool? DelayedOnly);
