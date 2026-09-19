using RealEstateErp.Domain.Crm;

namespace RealEstateErp.Application.Crm.Activities;

public record ActivityDto(
    Guid Id,
    ActivityType Type,
    string Subject,
    string? Description,
    DateTimeOffset? DueDate,
    ActivityStatus Status,
    DateTimeOffset? CompletedAt,
    Guid? LeadId,
    Guid? CustomerId,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    DateTimeOffset CreatedAt);

public record CreateActivityRequest(
    ActivityType Type,
    string Subject,
    string? Description,
    DateTimeOffset? DueDate,
    Guid? LeadId,
    Guid? CustomerId,
    Guid? AssignedToUserId);

public record UpdateActivityRequest(
    string Subject,
    string? Description,
    DateTimeOffset? DueDate);

public record ActivityFilter(
    Guid? LeadId,
    Guid? CustomerId,
    ActivityStatus? Status,
    ActivityType? Type,
    Guid? AssignedToUserId);
