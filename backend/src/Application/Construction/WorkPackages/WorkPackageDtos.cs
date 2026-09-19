using RealEstateErp.Domain.Construction;

namespace RealEstateErp.Application.Construction.WorkPackages;

public record WorkPackageDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Name,
    string Code,
    string? Description,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualStartDate,
    DateOnly? ActualEndDate,
    WorkPackageStatus Status,
    int ProgressPercent,
    Guid? ManagerUserId,
    string? ManagerUserName,
    decimal? Budget,
    int TaskCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateWorkPackageRequest(
    Guid ProjectId,
    string Name,
    string Code,
    string? Description,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    Guid? ManagerUserId,
    decimal? Budget);

public record UpdateWorkPackageRequest(
    string Name,
    string? Description,
    DateOnly? PlannedStartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualStartDate,
    DateOnly? ActualEndDate,
    int ProgressPercent,
    Guid? ManagerUserId,
    decimal? Budget);

public record ChangeWorkPackageStatusRequest(WorkPackageStatus Status);

public record WorkPackageFilter(Guid? ProjectId, WorkPackageStatus? Status, string? Search);
