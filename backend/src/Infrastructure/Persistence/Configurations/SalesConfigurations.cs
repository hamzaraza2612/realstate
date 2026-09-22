using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> b)
    {
        b.ToTable("bookings");
        b.HasKey(x => x.Id);
        b.Property(x => x.BookingNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Notes).HasMaxLength(4000);
        b.Property(x => x.TotalPrice).HasColumnType("numeric(18,2)");
        b.Property(x => x.Discount).HasColumnType("numeric(18,2)");
        b.Property(x => x.NetPrice).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.BookingNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.CustomerId });
        b.HasIndex(x => new { x.TenantId, x.SalesAgentUserId });

        // Reporting (Milestone 12): sales-by-period/-project/-agent and the Executive Dashboard's
        // Sales KPI all filter Confirmed bookings by BookingDate range — this composite index covers
        // that filter directly instead of a full tenant scan.
        b.HasIndex(x => new { x.TenantId, x.Status, x.BookingDate });

        // The actual double-booking guard: only one active (non-Cancelled) booking per unit, at the database level.
        b.HasIndex(x => x.InventoryUnitId).IsUnique().HasFilter("\"Status\" <> 3");

        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<InventoryUnit>().WithMany().HasForeignKey(x => x.InventoryUnitId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PaymentPlanConfiguration : IEntityTypeConfiguration<PaymentPlan>
{
    public void Configure(EntityTypeBuilder<PaymentPlan> b)
    {
        b.ToTable("payment_plans");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.BookingAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.DownPayment).HasColumnType("numeric(18,2)");

        b.HasIndex(x => x.BookingId).IsUnique();
        b.HasOne<Booking>().WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class InstallmentConfiguration : IEntityTypeConfiguration<Installment>
{
    public void Configure(EntityTypeBuilder<Installment> b)
    {
        b.ToTable("installments");
        b.HasKey(x => x.Id);
        b.Property(x => x.Label).HasMaxLength(100).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.BookingId });
        b.HasIndex(x => new { x.TenantId, x.Status, x.DueDate });
        b.HasIndex(x => new { x.PaymentPlanId, x.InstallmentNumber }).IsUnique();

        b.HasOne<Booking>().WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<PaymentPlan>().WithMany().HasForeignKey(x => x.PaymentPlanId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.ToTable("payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceiptNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);
        b.Property(x => x.IdempotencyKey).HasMaxLength(100);

        b.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.BookingId });
        b.HasIndex(x => new { x.TenantId, x.InstallmentId });
        b.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");

        // Reporting (Milestone 12): Sales collections/trend reports and the Executive Dashboard's
        // Collections KPI filter and group by PaymentDate range.
        b.HasIndex(x => new { x.TenantId, x.PaymentDate });

        b.HasOne<Booking>().WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Installment>().WithMany().HasForeignKey(x => x.InstallmentId).OnDelete(DeleteBehavior.Restrict);
    }
}
