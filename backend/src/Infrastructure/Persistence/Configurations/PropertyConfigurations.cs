using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Property;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> b)
    {
        b.ToTable("properties");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.AddressLine).HasMaxLength(300);
        b.Property(x => x.City).HasMaxLength(100);
        b.Property(x => x.State).HasMaxLength(100);
        b.Property(x => x.Country).HasMaxLength(100);
        b.Property(x => x.PostalCode).HasMaxLength(20);
        b.Property(x => x.OwnerName).HasMaxLength(200);
        b.Property(x => x.OwnerContact).HasMaxLength(200);

        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.Type });
    }
}

public class PropertyUnitConfiguration : IEntityTypeConfiguration<PropertyUnit>
{
    public void Configure(EntityTypeBuilder<PropertyUnit> b)
    {
        b.ToTable("property_units");
        b.HasKey(x => x.Id);
        b.Property(x => x.BuildingBlock).HasMaxLength(100);
        b.Property(x => x.UnitNumber).HasMaxLength(50).IsRequired();
        b.Property(x => x.Floor).HasMaxLength(30);
        b.Property(x => x.AreaSize).HasColumnType("numeric(18,2)");
        b.Property(x => x.AreaUnit).HasMaxLength(20);
        b.Property(x => x.MarketRentRate).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.PropertyId, x.UnitNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<Property>().WithMany().HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class RentalTenantConfiguration : IEntityTypeConfiguration<RentalTenant>
{
    public void Configure(EntityTypeBuilder<RentalTenant> b)
    {
        b.ToTable("rental_tenants");
        b.HasKey(x => x.Id);
        b.Property(x => x.IdentificationNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.CustomerId }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.IsActive });

        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class LeaseConfiguration : IEntityTypeConfiguration<Lease>
{
    public void Configure(EntityTypeBuilder<Lease> b)
    {
        b.ToTable("leases");
        b.HasKey(x => x.Id);
        b.Property(x => x.LeaseNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.RentAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.SecurityDeposit).HasColumnType("numeric(18,2)");
        b.Property(x => x.Terms).HasMaxLength(4000);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.LeaseNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.PropertyId });
        b.HasIndex(x => new { x.TenantId, x.UnitId });

        // Only one non-terminal (Draft/PendingApproval/Active = status < 3) lease may exist per unit at a time —
        // the DB-level half of the conflicting-lease guard, mirroring Sales' double-booking partial unique index.
        b.HasIndex(x => x.UnitId).IsUnique().HasFilter("\"Status\" < 3");

        b.HasOne<RealEstateErp.Domain.Property.Property>().WithMany().HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PropertyUnit>().WithMany().HasForeignKey(x => x.UnitId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<RentalTenant>().WithMany().HasForeignKey(x => x.RentalTenantId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class RentScheduleConfiguration : IEntityTypeConfiguration<RentSchedule>
{
    public void Configure(EntityTypeBuilder<RentSchedule> b)
    {
        b.ToTable("rent_schedules");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.LeaseId, x.PeriodNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status, x.DueDate });

        b.HasOne<Lease>().WithMany().HasForeignKey(x => x.LeaseId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RentPaymentConfiguration : IEntityTypeConfiguration<RentPayment>
{
    public void Configure(EntityTypeBuilder<RentPayment> b)
    {
        b.ToTable("rent_payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceiptNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);
        b.Property(x => x.IdempotencyKey).HasMaxLength(100);

        b.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.LeaseId });
        b.HasIndex(x => new { x.TenantId, x.RentScheduleId });
        b.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");

        b.HasOne<Lease>().WithMany().HasForeignKey(x => x.LeaseId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<RentSchedule>().WithMany().HasForeignKey(x => x.RentScheduleId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class SecurityDepositConfiguration : IEntityTypeConfiguration<SecurityDeposit>
{
    public void Configure(EntityTypeBuilder<SecurityDeposit> b)
    {
        b.ToTable("security_deposits");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.RefundedAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => x.LeaseId).IsUnique();

        b.HasOne<Lease>().WithMany().HasForeignKey(x => x.LeaseId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class MaintenanceRequestConfiguration : IEntityTypeConfiguration<MaintenanceRequest>
{
    public void Configure(EntityTypeBuilder<MaintenanceRequest> b)
    {
        b.ToTable("maintenance_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.RequestNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        b.Property(x => x.ResolutionNotes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.RequestNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.PropertyId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<RealEstateErp.Domain.Property.Property>().WithMany().HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PropertyUnit>().WithMany().HasForeignKey(x => x.UnitId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<RentalTenant>().WithMany().HasForeignKey(x => x.RentalTenantId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Vendor>().WithMany().HasForeignKey(x => x.AssignedVendorId).OnDelete(DeleteBehavior.Restrict);
    }
}
