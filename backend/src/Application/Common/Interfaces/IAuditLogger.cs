namespace RealEstateErp.Application.Common.Interfaces;

public interface IAuditLogger
{
    /// <summary>
    /// Logs an action against the ambient tenant context, unless <paramref name="tenantIdOverride"/> is
    /// supplied — needed for auth events (login/logout), where the request itself is unauthenticated so
    /// there is no ambient tenant to attribute the entry to; the caller instead passes the tenant the
    /// authenticated user actually belongs to.
    /// </summary>
    Task LogAsync(string action, string module, string entityType, string? entityId,
        object? before = null, object? after = null, Guid? tenantIdOverride = null,
        Guid? actorIdOverride = null, string? actorEmailOverride = null, CancellationToken ct = default);
}
