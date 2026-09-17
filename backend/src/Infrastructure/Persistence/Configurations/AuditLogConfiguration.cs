using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Administration;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("audit_logs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Action).HasMaxLength(200).IsRequired();
        b.Property(x => x.Module).HasMaxLength(100).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(200).IsRequired();
        b.Property(x => x.EntityId).HasMaxLength(100);
        b.Property(x => x.UserEmail).HasMaxLength(256);
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.HasIndex(x => new { x.TenantId, x.CreatedAt });
        b.HasIndex(x => x.EntityType);
    }
}
