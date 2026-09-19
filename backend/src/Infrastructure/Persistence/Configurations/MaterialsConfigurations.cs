using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Materials;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    public void Configure(EntityTypeBuilder<Material> b)
    {
        b.ToTable("materials");
        b.HasKey(x => x.Id);
        b.Property(x => x.Sku).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.UnitOfMeasure).HasMaxLength(30).IsRequired();
        b.Property(x => x.Category).HasMaxLength(100);
        b.Property(x => x.CurrentQuantity).HasColumnType("numeric(18,3)");
        b.Property(x => x.MinimumQuantity).HasColumnType("numeric(18,3)");

        b.HasIndex(x => new { x.TenantId, x.Sku }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.IsActive });
    }
}

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> b)
    {
        b.ToTable("stock_movements");
        b.HasKey(x => x.Id);
        b.Property(x => x.Quantity).HasColumnType("numeric(18,3)");
        b.Property(x => x.ReferenceType).HasMaxLength(50);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.MaterialId });
        b.HasIndex(x => new { x.TenantId, x.ReferenceType, x.ReferenceId });

        b.HasOne<Material>().WithMany().HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);
    }
}
