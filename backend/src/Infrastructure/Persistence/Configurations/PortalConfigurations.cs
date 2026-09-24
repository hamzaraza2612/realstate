using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Portal;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class PortalUserConfiguration : IEntityTypeConfiguration<PortalUser>
{
    public void Configure(EntityTypeBuilder<PortalUser> b)
    {
        b.ToTable("portal_users");
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.NormalizedEmail).HasMaxLength(256).IsRequired();
        b.Property(x => x.PasswordHash).IsRequired();
        b.Property(x => x.ActorType).HasMaxLength(50).IsRequired();

        // Tenant-scoped uniqueness (not platform-wide, unlike AppUser's effective global email
        // uniqueness) — see PortalUser's doc comment for why that distinction is the entire reason
        // this is a separate table.
        b.HasIndex(x => new { x.TenantId, x.NormalizedEmail }).IsUnique();

        // One portal login per actor record in this milestone (not multiple sub-users per company).
        b.HasIndex(x => new { x.TenantId, x.ActorType, x.ActorId }).IsUnique();
    }
}

public class PortalRefreshTokenConfiguration : IEntityTypeConfiguration<PortalRefreshToken>
{
    public void Configure(EntityTypeBuilder<PortalRefreshToken> b)
    {
        b.ToTable("portal_refresh_tokens");
        b.HasKey(x => x.Id);
        b.Property(x => x.TokenHash).HasMaxLength(200).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.Property(x => x.CreatedByIp).HasMaxLength(64);
        b.Property(x => x.ReplacedByTokenHash).HasMaxLength(200);
        b.HasIndex(x => x.PortalUserId);
    }
}

public class PortalPasswordResetTokenConfiguration : IEntityTypeConfiguration<PortalPasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PortalPasswordResetToken> b)
    {
        b.ToTable("portal_password_reset_tokens");
        b.HasKey(x => x.Id);
        b.Property(x => x.TokenHash).HasMaxLength(200).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.HasIndex(x => x.PortalUserId);
    }
}
