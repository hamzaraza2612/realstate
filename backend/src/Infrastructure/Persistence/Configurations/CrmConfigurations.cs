using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Crm;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> b)
    {
        b.ToTable("leads");
        b.HasKey(x => x.Id);
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Phone).HasMaxLength(50);
        b.Property(x => x.CompanyName).HasMaxLength(200);
        b.Property(x => x.Notes).HasMaxLength(4000);
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.AssignedToUserId });
        b.HasIndex(x => new { x.TenantId, x.CreatedAt });
    }
}

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("customers");
        b.HasKey(x => x.Id);
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Phone).HasMaxLength(50);
        b.Property(x => x.Address).HasMaxLength(500);
        b.Property(x => x.CompanyName).HasMaxLength(200);
        b.HasIndex(x => new { x.TenantId, x.Email });
        b.HasIndex(x => x.ConvertedFromLeadId).IsUnique().HasFilter("\"ConvertedFromLeadId\" IS NOT NULL");
    }
}

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> b)
    {
        b.ToTable("activities");
        b.HasKey(x => x.Id);
        b.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.HasIndex(x => new { x.TenantId, x.LeadId });
        b.HasIndex(x => new { x.TenantId, x.CustomerId });
        b.HasIndex(x => new { x.TenantId, x.Status, x.DueDate });

        b.HasOne<Lead>().WithMany().HasForeignKey(x => x.LeadId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);

        b.ToTable(t => t.HasCheckConstraint("CK_activities_lead_or_customer", "\"LeadId\" IS NOT NULL OR \"CustomerId\" IS NOT NULL"));
    }
}
