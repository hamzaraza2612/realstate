using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Administration;

/// <summary>Immutable record of a sensitive or state-changing action. Never updated or deleted.</summary>
public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = default!;
    public string Module { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public string? EntityId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
