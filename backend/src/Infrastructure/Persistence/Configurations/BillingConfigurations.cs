using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Billing;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> b)
    {
        b.ToTable("invoices");
        b.HasKey(x => x.Id);
        b.Property(x => x.InvoiceNumber).HasMaxLength(50).IsRequired();
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.Subtotal).HasColumnType("numeric(18,2)");
        b.Property(x => x.TaxAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Total).HasColumnType("numeric(18,2)");
        b.Property(x => x.ExternalProviderReference).HasMaxLength(200);
        // Tenant-scoped uniqueness, not global — matches BookingNumber/LeaseNumber convention.
        b.HasIndex(x => new { x.TenantId, x.InvoiceNumber }).IsUnique();
        b.HasIndex(x => x.SubscriptionId);
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => x.DueDate);
        b.HasMany(x => x.LineItems).WithOne(x => x.Invoice!).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class InvoiceLineItemConfiguration : IEntityTypeConfiguration<InvoiceLineItem>
{
    public void Configure(EntityTypeBuilder<InvoiceLineItem> b)
    {
        b.ToTable("invoice_line_items");
        b.HasKey(x => x.Id);
        b.Property(x => x.Description).HasMaxLength(500).IsRequired();
        b.Property(x => x.Quantity).HasColumnType("numeric(18,2)");
        b.Property(x => x.UnitPrice).HasColumnType("numeric(18,2)");
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
    }
}

public class BillingPaymentConfiguration : IEntityTypeConfiguration<BillingPayment>
{
    public void Configure(EntityTypeBuilder<BillingPayment> b)
    {
        b.ToTable("billing_payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.Provider).HasMaxLength(50).IsRequired();
        b.Property(x => x.ProviderTransactionId).HasMaxLength(200);
        b.Property(x => x.IdempotencyKey).HasMaxLength(200).IsRequired();
        b.Property(x => x.FailureReason).HasMaxLength(1000);
        b.HasIndex(x => x.InvoiceId);
        // Tenant-scoped uniqueness — a retried "record payment" request never double-posts, without
        // colliding with another tenant's independently-generated idempotency key.
        b.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique();
    }
}
