using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Infrastructure.Identity;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        b.ToTable("users");
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.HasIndex(x => new { x.TenantId, x.NormalizedEmail });
    }
}

public class AppRoleConfiguration : IEntityTypeConfiguration<AppRole>
{
    public void Configure(EntityTypeBuilder<AppRole> b)
    {
        b.ToTable("roles");
        b.Property(x => x.Description).HasMaxLength(500);
        // Identity's own base configuration puts a *global* unique index on NormalizedName alone
        // ("RoleNameIndex"), which would stop a second tenant from ever naming a custom role the
        // same as another tenant's (e.g. both wanting "Manager") — a real multi-tenant SaaS needs
        // role names unique per tenant, not platform-wide. Override it to non-unique and make the
        // per-tenant compound index the real uniqueness constraint instead.
        b.HasIndex(x => x.NormalizedName).IsUnique(false);
        b.HasIndex(x => new { x.TenantId, x.NormalizedName }).IsUnique();
    }
}

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> b)
    {
        b.ToTable("permissions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(150).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Module).HasMaxLength(100).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
    }
}

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> b)
    {
        b.ToTable("role_permissions");
        b.HasKey(x => new { x.RoleId, x.PermissionId });
        b.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("refresh_tokens");
        b.HasKey(x => x.Id);
        b.Property(x => x.TokenHash).HasMaxLength(200).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.Property(x => x.CreatedByIp).HasMaxLength(64);
        b.Property(x => x.ReplacedByTokenHash).HasMaxLength(200);
        b.HasIndex(x => x.UserId);
    }
}
