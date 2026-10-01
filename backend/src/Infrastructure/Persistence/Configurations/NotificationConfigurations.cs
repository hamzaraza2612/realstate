using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Notifications;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Body).HasMaxLength(2000).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(50);

        // The two access patterns: "my recent notifications" and "my unread count/list".
        b.HasIndex(x => new { x.TenantId, x.UserId, x.CreatedAt });
        b.HasIndex(x => new { x.TenantId, x.UserId, x.IsRead });
    }
}

public class NotificationPreferenceConfiguration : IEntityTypeConfiguration<NotificationPreference>
{
    public void Configure(EntityTypeBuilder<NotificationPreference> b)
    {
        b.ToTable("notification_preferences");
        b.HasKey(x => x.Id);

        b.HasIndex(x => new { x.TenantId, x.UserId, x.Category }).IsUnique();
    }
}

public class DeviceRegistrationConfiguration : IEntityTypeConfiguration<DeviceRegistration>
{
    public void Configure(EntityTypeBuilder<DeviceRegistration> b)
    {
        b.ToTable("device_registrations");
        b.HasKey(x => x.Id);
        b.Property(x => x.PushToken).HasMaxLength(500).IsRequired();

        // One row per (tenant, owner, platform) — a re-registration upserts in place.
        b.HasIndex(x => new { x.TenantId, x.OwnerId, x.IsPortalOwner, x.Platform }).IsUnique();
    }
}
