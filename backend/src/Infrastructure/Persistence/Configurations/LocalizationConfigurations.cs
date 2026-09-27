using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Localization;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class TaxProfileConfiguration : IEntityTypeConfiguration<TaxProfile>
{
    public void Configure(EntityTypeBuilder<TaxProfile> b)
    {
        b.ToTable("tax_profiles");
        b.HasKey(x => x.Id);
        b.Property(x => x.CountryCode).HasMaxLength(2).IsRequired();
        b.Property(x => x.Code).HasMaxLength(40).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        // Platform-wide catalog — globally unique by design (not tenant-owned, so the usual
        // tenant-scoped-uniqueness convention doesn't apply here).
        b.HasIndex(x => x.Code).IsUnique();
        b.HasIndex(x => x.CountryCode);
        b.HasMany(x => x.Rates).WithOne(x => x.TaxProfile!).HasForeignKey(x => x.TaxProfileId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class TaxRateConfiguration : IEntityTypeConfiguration<TaxRate>
{
    public void Configure(EntityTypeBuilder<TaxRate> b)
    {
        b.ToTable("tax_rates");
        b.HasKey(x => x.Id);
        b.Property(x => x.RateCode).HasMaxLength(40).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Percentage).HasColumnType("numeric(6,3)");
        b.HasIndex(x => new { x.TaxProfileId, x.RateCode });
        b.HasIndex(x => new { x.TaxProfileId, x.EffectiveFrom });
    }
}

public class ExchangeRateConfiguration : IEntityTypeConfiguration<ExchangeRate>
{
    public void Configure(EntityTypeBuilder<ExchangeRate> b)
    {
        b.ToTable("exchange_rates");
        b.HasKey(x => x.Id);
        b.Property(x => x.BaseCurrency).HasMaxLength(3).IsRequired();
        b.Property(x => x.QuoteCurrency).HasMaxLength(3).IsRequired();
        b.Property(x => x.Rate).HasColumnType("numeric(18,8)");
        b.Property(x => x.Source).HasMaxLength(50).IsRequired();
        b.HasIndex(x => new { x.BaseCurrency, x.QuoteCurrency, x.EffectiveAt });
    }
}

public class TenantTaxProfileConfiguration : IEntityTypeConfiguration<TenantTaxProfile>
{
    public void Configure(EntityTypeBuilder<TenantTaxProfile> b)
    {
        b.ToTable("tenant_tax_profiles");
        b.HasKey(x => x.Id);
        b.Property(x => x.TaxRegistrationNumber).HasMaxLength(50);
        b.Property(x => x.LegalEntityName).HasMaxLength(200);
        b.Property(x => x.LegalAddressLine1).HasMaxLength(200);
        b.Property(x => x.LegalAddressLine2).HasMaxLength(200);
        b.Property(x => x.LegalCity).HasMaxLength(100);
        b.Property(x => x.LegalStateOrProvince).HasMaxLength(100);
        b.Property(x => x.LegalPostalCode).HasMaxLength(20);
        b.Property(x => x.LegalCountryCode).HasMaxLength(2);
        // One row per tenant.
        b.HasIndex(x => x.TenantId).IsUnique();
        b.HasOne(x => x.TaxProfile).WithMany().HasForeignKey(x => x.TaxProfileId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class EInvoiceSubmissionConfiguration : IEntityTypeConfiguration<EInvoiceSubmission>
{
    public void Configure(EntityTypeBuilder<EInvoiceSubmission> b)
    {
        b.ToTable("einvoice_submissions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Provider).HasMaxLength(50).IsRequired();
        b.Property(x => x.ExternalReference).HasMaxLength(200);
        b.Property(x => x.ErrorDetails).HasMaxLength(2000);
        b.HasIndex(x => x.InvoiceId);
        b.HasIndex(x => new { x.TenantId, x.Status });
    }
}
