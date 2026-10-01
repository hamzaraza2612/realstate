using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Notifications;

public enum DevicePlatform
{
    Ios = 0,
    Android = 1,
    Web = 2,
}

/// <summary>
/// The device-registration half of the push-notification seam (Milestone 18) — deliberately just a
/// token store, never a sender. No push provider (APNs/FCM) credential exists in this environment, so
/// no delivery is attempted or claimed anywhere in this codebase; this table only lets a mobile client
/// register "notify this device" so that capability exists to wire up later. One row per
/// (tenant, owner, platform) — a re-registration (e.g. app reinstall, token rotation) upserts in
/// place rather than accumulating stale tokens.
/// </summary>
public class DeviceRegistration : TenantEntity
{
    /// <summary>Either an internal AppUser.Id or a PortalUser.Id, disambiguated by
    /// <see cref="IsPortalOwner"/> — mirrors how Notification.UserId is a plain, non-FK id with no
    /// shared identity table between the two actor kinds.</summary>
    public Guid OwnerId { get; set; }
    public bool IsPortalOwner { get; set; }
    public DevicePlatform Platform { get; set; }
    public string PushToken { get; set; } = default!;
    public DateTimeOffset LastRegisteredAt { get; set; } = DateTimeOffset.UtcNow;
}
