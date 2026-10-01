using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Notifications;

public class DeviceRegistrationService : IDeviceRegistrationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public DeviceRegistrationService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<Result> RegisterAsync(Guid ownerId, bool isPortalOwner, RegisterDeviceTokenRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId)
            return Result.Failure("No tenant context.", "no_context");

        if (!Enum.TryParse<DevicePlatform>(request.Platform, ignoreCase: true, out var platform))
            return Result.Failure("Unknown platform.", "invalid_platform");

        // Upsert by (tenant, owner, platform) — a reinstall or token rotation replaces the prior
        // token for that device class rather than accumulating stale rows that would otherwise be
        // the only thing standing between "seam exists" and silently paging a long-uninstalled app.
        var existing = await _db.DeviceRegistrations.FirstOrDefaultAsync(
            d => d.OwnerId == ownerId && d.IsPortalOwner == isPortalOwner && d.Platform == platform, ct);

        if (existing is not null)
        {
            existing.PushToken = request.PushToken;
            existing.LastRegisteredAt = DateTimeOffset.UtcNow;
        }
        else
        {
            _db.DeviceRegistrations.Add(new DeviceRegistration
            {
                TenantId = tenantId,
                OwnerId = ownerId,
                IsPortalOwner = isPortalOwner,
                Platform = platform,
                PushToken = request.PushToken,
                LastRegisteredAt = DateTimeOffset.UtcNow,
            });
        }

        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
