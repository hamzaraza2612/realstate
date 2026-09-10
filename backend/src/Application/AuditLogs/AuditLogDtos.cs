namespace RealEstateErp.Application.AuditLogs;

public record AuditLogDto(
    Guid Id, Guid? TenantId, Guid? UserId, string? UserEmail, string Action, string Module,
    string EntityType, string? EntityId, string? BeforeJson, string? AfterJson,
    string? IpAddress, DateTimeOffset CreatedAt);

public record AuditLogFilter(string? Module, string? Action, string? EntityType, DateTimeOffset? From, DateTimeOffset? To);
