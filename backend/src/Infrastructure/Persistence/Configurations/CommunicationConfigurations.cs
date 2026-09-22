using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Communication;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class CommunicationLogConfiguration : IEntityTypeConfiguration<CommunicationLog>
{
    public void Configure(EntityTypeBuilder<CommunicationLog> b)
    {
        b.ToTable("communication_logs");
        b.HasKey(x => x.Id);
        b.Property(x => x.RecipientAddress).HasMaxLength(320);
        b.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        b.Property(x => x.Body).HasMaxLength(4000).IsRequired();
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);
        b.Property(x => x.EntityType).HasMaxLength(50);

        b.HasIndex(x => new { x.TenantId, x.RecipientUserId });
        b.HasIndex(x => new { x.TenantId, x.CreatedAt });
    }
}
