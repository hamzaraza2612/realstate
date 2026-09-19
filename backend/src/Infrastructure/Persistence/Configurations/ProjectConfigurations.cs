using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> b)
    {
        b.ToTable("projects");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.AddressLine).HasMaxLength(500);
        b.Property(x => x.City).HasMaxLength(100);
        b.Property(x => x.State).HasMaxLength(100);
        b.Property(x => x.Country).HasMaxLength(100);
        b.Property(x => x.PostalCode).HasMaxLength(20);
        b.Property(x => x.Latitude).HasColumnType("numeric(9,6)");
        b.Property(x => x.Longitude).HasColumnType("numeric(9,6)");

        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Type });
        b.HasIndex(x => new { x.TenantId, x.Status });
    }
}

public class ProjectNodeConfiguration : IEntityTypeConfiguration<ProjectNode>
{
    public void Configure(EntityTypeBuilder<ProjectNode> b)
    {
        b.ToTable("project_nodes");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Latitude).HasColumnType("numeric(9,6)");
        b.Property(x => x.Longitude).HasColumnType("numeric(9,6)");

        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.ParentNodeId });
        b.HasIndex(x => new { x.ProjectId, x.Code }).IsUnique();

        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<ProjectNode>().WithMany().HasForeignKey(x => x.ParentNodeId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class InventoryUnitConfiguration : IEntityTypeConfiguration<InventoryUnit>
{
    public void Configure(EntityTypeBuilder<InventoryUnit> b)
    {
        b.ToTable("inventory_units");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.AreaSize).HasColumnType("numeric(18,2)");
        b.Property(x => x.Latitude).HasColumnType("numeric(9,6)");
        b.Property(x => x.Longitude).HasColumnType("numeric(9,6)");

        b.HasIndex(x => new { x.TenantId, x.ProjectId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.NodeId });
        b.HasIndex(x => new { x.TenantId, x.Type });
        b.HasIndex(x => new { x.ProjectId, x.Code }).IsUnique();

        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<ProjectNode>().WithMany().HasForeignKey(x => x.NodeId).OnDelete(DeleteBehavior.Restrict);
    }
}
