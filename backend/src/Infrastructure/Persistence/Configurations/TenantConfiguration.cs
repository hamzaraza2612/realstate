using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Tenancy;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> b)
    {
        b.ToTable("tenants");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.Timezone).HasMaxLength(100).IsRequired();
        b.Property(x => x.ContactEmail).HasMaxLength(256);
        b.Property(x => x.ContactPhone).HasMaxLength(50);
        b.HasQueryFilter(x => !x.IsDeleted);
    }
}
