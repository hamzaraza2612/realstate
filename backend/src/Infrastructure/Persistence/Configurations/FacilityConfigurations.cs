using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Property;
using PropertyEntity = RealEstateErp.Domain.Property.Property;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class FacilityConfiguration : IEntityTypeConfiguration<Facility>
{
    public void Configure(EntityTypeBuilder<Facility> b)
    {
        b.ToTable("facilities");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.AddressLine).HasMaxLength(300);
        b.Property(x => x.City).HasMaxLength(100);

        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.PropertyId });
        b.HasIndex(x => new { x.TenantId, x.Type });

        b.HasOne<PropertyEntity>().WithMany().HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class SpaceConfiguration : IEntityTypeConfiguration<Space>
{
    public void Configure(EntityTypeBuilder<Space> b)
    {
        b.ToTable("spaces");
        b.HasKey(x => x.Id);
        b.Property(x => x.BuildingBlock).HasMaxLength(100);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.AreaSize).HasColumnType("numeric(18,2)");
        b.Property(x => x.Rate).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.FacilityId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => x.PropertyUnitId);

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PropertyUnit>().WithMany().HasForeignKey(x => x.PropertyUnitId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class UtilityReadingConfiguration : IEntityTypeConfiguration<UtilityReading>
{
    public void Configure(EntityTypeBuilder<UtilityReading> b)
    {
        b.ToTable("utility_readings");
        b.HasKey(x => x.Id);
        b.Property(x => x.MeterReference).HasMaxLength(100).IsRequired();
        b.Property(x => x.ReadingValue).HasColumnType("numeric(18,3)");
        b.Property(x => x.Consumption).HasColumnType("numeric(18,3)");
        b.Property(x => x.RatePerUnit).HasColumnType("numeric(18,4)");
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.FacilityId, x.MeterReference });
        b.HasIndex(x => new { x.TenantId, x.PropertyId, x.MeterReference });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PropertyEntity>().WithMany().HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);

        b.ToTable(t => t.HasCheckConstraint("CK_utility_readings_facility_or_property", "\"FacilityId\" IS NOT NULL OR \"PropertyId\" IS NOT NULL"));
    }
}

public class ServiceRequestConfiguration : IEntityTypeConfiguration<Domain.Facility.ServiceRequest>
{
    public void Configure(EntityTypeBuilder<Domain.Facility.ServiceRequest> b)
    {
        b.ToTable("facility_service_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.RequestNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        b.Property(x => x.ResolutionNotes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.RequestNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.FacilityId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Space>().WithMany().HasForeignKey(x => x.SpaceId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Vendor>().WithMany().HasForeignKey(x => x.AssignedVendorId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.RequesterCustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class FacilityPaymentConfiguration : IEntityTypeConfiguration<FacilityPayment>
{
    public void Configure(EntityTypeBuilder<FacilityPayment> b)
    {
        b.ToTable("facility_payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceiptNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);
        b.Property(x => x.IdempotencyKey).HasMaxLength(100);

        b.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.SourceType, x.SourceId });
        b.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");
    }
}
