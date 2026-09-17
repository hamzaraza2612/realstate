using System.Text.Json;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Administration;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services;

public class AuditLogger : IAuditLogger
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _accessor;

    public AuditLogger(AppDbContext db, ITenantContext tenantContext, Microsoft.AspNetCore.Http.IHttpContextAccessor accessor)
    {
        _db = db;
        _tenantContext = tenantContext;
        _accessor = accessor;
    }

    public async Task LogAsync(string action, string module, string entityType, string? entityId, object? before = null, object? after = null, Guid? tenantIdOverride = null, Guid? actorIdOverride = null, string? actorEmailOverride = null, CancellationToken ct = default)
    {
        var log = new AuditLog
        {
            TenantId = tenantIdOverride ?? _tenantContext.TenantId,
            UserId = actorIdOverride ?? _tenantContext.UserId,
            UserEmail = actorEmailOverride ?? _tenantContext.UserEmail,
            Action = action,
            Module = module,
            EntityType = entityType,
            EntityId = entityId,
            BeforeJson = before is null ? null : JsonSerializer.Serialize(before),
            AfterJson = after is null ? null : JsonSerializer.Serialize(after),
            IpAddress = _accessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }
}
