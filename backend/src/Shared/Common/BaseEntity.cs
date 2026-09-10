namespace RealEstateErp.Shared.Common;

/// <summary>Base for every persisted entity. Non-tenant entities (e.g. Tenant itself, platform-level data) derive from this directly.</summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
}

/// <summary>Marker for entities owned by a tenant; the SaveChanges interceptor stamps TenantId and the DbContext applies a global query filter on it.</summary>
public interface ITenantOwned
{
    Guid TenantId { get; set; }
}

/// <summary>Opt-in for entities that should be soft-deleted instead of hard-deleted (financial/legal records).</summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTimeOffset? DeletedAt { get; set; }
    Guid? DeletedBy { get; set; }
}

public abstract class TenantEntity : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
}
