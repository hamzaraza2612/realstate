using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Materials;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class VendorConfiguration : IEntityTypeConfiguration<Vendor>
{
    public void Configure(EntityTypeBuilder<Vendor> b)
    {
        b.ToTable("vendors");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.ContactPerson).HasMaxLength(200);
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Phone).HasMaxLength(50);
        b.Property(x => x.Address).HasMaxLength(500);
        b.Property(x => x.TaxRegistrationNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.Name });
        b.HasIndex(x => new { x.TenantId, x.IsActive });
    }
}

public class PurchaseRequestConfiguration : IEntityTypeConfiguration<PurchaseRequest>
{
    public void Configure(EntityTypeBuilder<PurchaseRequest> b)
    {
        b.ToTable("purchase_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.RequestNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.RequestNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<WorkPackage>().WithMany().HasForeignKey(x => x.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseRequestLineConfiguration : IEntityTypeConfiguration<PurchaseRequestLine>
{
    public void Configure(EntityTypeBuilder<PurchaseRequestLine> b)
    {
        b.ToTable("purchase_request_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.ItemDescription).HasMaxLength(300).IsRequired();
        b.Property(x => x.UnitOfMeasure).HasMaxLength(30).IsRequired();
        b.Property(x => x.Quantity).HasColumnType("numeric(18,3)");
        b.Property(x => x.EstimatedUnitPrice).HasColumnType("numeric(18,2)");
        b.Property(x => x.EstimatedTotal).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.PurchaseRequestId });

        b.HasOne<PurchaseRequest>().WithMany().HasForeignKey(x => x.PurchaseRequestId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Material>().WithMany().HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> b)
    {
        b.ToTable("purchase_orders");
        b.HasKey(x => x.Id);
        b.Property(x => x.PoNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Subtotal).HasColumnType("numeric(18,2)");
        b.Property(x => x.Discount).HasColumnType("numeric(18,2)");
        b.Property(x => x.TaxAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Total).HasColumnType("numeric(18,2)");
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.PoNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.VendorId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        // Reporting (Milestone 12): the vendor-spend report filters by OrderDate range across all
        // statuses, so the existing (TenantId, Status) index doesn't cover it.
        b.HasIndex(x => new { x.TenantId, x.OrderDate });

        b.HasOne<Vendor>().WithMany().HasForeignKey(x => x.VendorId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<WorkPackage>().WithMany().HasForeignKey(x => x.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PurchaseRequest>().WithMany().HasForeignKey(x => x.PurchaseRequestId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseOrderLineConfiguration : IEntityTypeConfiguration<PurchaseOrderLine>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderLine> b)
    {
        b.ToTable("purchase_order_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.ItemDescription).HasMaxLength(300).IsRequired();
        b.Property(x => x.UnitOfMeasure).HasMaxLength(30).IsRequired();
        b.Property(x => x.Quantity).HasColumnType("numeric(18,3)");
        b.Property(x => x.UnitPrice).HasColumnType("numeric(18,2)");
        b.Property(x => x.Total).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReceivedQuantity).HasColumnType("numeric(18,3)");

        b.HasIndex(x => new { x.TenantId, x.PurchaseOrderId });

        b.HasOne<PurchaseOrder>().WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Material>().WithMany().HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);

        // The actual over-receiving guard: enforced at the database level, not just in application code.
        b.ToTable(t => t.HasCheckConstraint("CK_purchase_order_lines_received_not_exceed_ordered", "\"ReceivedQuantity\" <= \"Quantity\""));
    }
}

public class MaterialReceiptConfiguration : IEntityTypeConfiguration<MaterialReceipt>
{
    public void Configure(EntityTypeBuilder<MaterialReceipt> b)
    {
        b.ToTable("material_receipts");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceiptNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.PurchaseOrderId });

        b.HasOne<PurchaseOrder>().WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Vendor>().WithMany().HasForeignKey(x => x.VendorId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class MaterialReceiptLineConfiguration : IEntityTypeConfiguration<MaterialReceiptLine>
{
    public void Configure(EntityTypeBuilder<MaterialReceiptLine> b)
    {
        b.ToTable("material_receipt_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceivedQuantity).HasColumnType("numeric(18,3)");

        b.HasIndex(x => new { x.TenantId, x.MaterialReceiptId });
        b.HasIndex(x => new { x.TenantId, x.PurchaseOrderLineId });

        b.HasOne<MaterialReceipt>().WithMany().HasForeignKey(x => x.MaterialReceiptId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<PurchaseOrderLine>().WithMany().HasForeignKey(x => x.PurchaseOrderLineId).OnDelete(DeleteBehavior.Restrict);
    }
}
