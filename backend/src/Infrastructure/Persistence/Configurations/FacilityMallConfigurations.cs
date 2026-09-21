using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Domain.Property;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class MallShopProfileConfiguration : IEntityTypeConfiguration<MallShopProfile>
{
    public void Configure(EntityTypeBuilder<MallShopProfile> b)
    {
        b.ToTable("mall_shop_profiles");
        b.HasKey(x => x.Id);
        b.Property(x => x.TradeCategory).HasMaxLength(100);
        b.Property(x => x.StorefrontName).HasMaxLength(200);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => x.SpaceId).IsUnique();

        b.HasOne<Space>().WithMany().HasForeignKey(x => x.SpaceId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ServiceChargeDefinitionConfiguration : IEntityTypeConfiguration<ServiceChargeDefinition>
{
    public void Configure(EntityTypeBuilder<ServiceChargeDefinition> b)
    {
        b.ToTable("service_charge_definitions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.FacilityId });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ServiceChargeChargeConfiguration : IEntityTypeConfiguration<ServiceChargeCharge>
{
    public void Configure(EntityTypeBuilder<ServiceChargeCharge> b)
    {
        b.ToTable("service_charge_charges");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.LeaseId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<ServiceChargeDefinition>().WithMany().HasForeignKey(x => x.ServiceChargeDefinitionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Lease>().WithMany().HasForeignKey(x => x.LeaseId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ParkingSpaceConfiguration : IEntityTypeConfiguration<ParkingSpace>
{
    public void Configure(EntityTypeBuilder<ParkingSpace> b)
    {
        b.ToTable("parking_spaces");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.FacilityId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ParkingAllocationConfiguration : IEntityTypeConfiguration<ParkingAllocation>
{
    public void Configure(EntityTypeBuilder<ParkingAllocation> b)
    {
        b.ToTable("parking_allocations");
        b.HasKey(x => x.Id);
        b.Property(x => x.VehicleReference).HasMaxLength(100);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.ParkingSpaceId });
        b.HasIndex(x => x.ParkingSpaceId).IsUnique().HasFilter("\"Status\" = 0");

        b.HasOne<ParkingSpace>().WithMany().HasForeignKey(x => x.ParkingSpaceId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<RentalTenant>().WithMany().HasForeignKey(x => x.RentalTenantId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class FacilityEventConfiguration : IEntityTypeConfiguration<FacilityEvent>
{
    public void Configure(EntityTypeBuilder<FacilityEvent> b)
    {
        b.ToTable("facility_events");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Location).HasMaxLength(300);
        b.Property(x => x.Organizer).HasMaxLength(200);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.FacilityId });
        b.HasIndex(x => new { x.TenantId, x.StartAt });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TenantNoticeConfiguration : IEntityTypeConfiguration<TenantNotice>
{
    public void Configure(EntityTypeBuilder<TenantNotice> b)
    {
        b.ToTable("tenant_notices");
        b.HasKey(x => x.Id);
        b.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        b.Property(x => x.Content).HasMaxLength(4000).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.FacilityId });
        b.HasIndex(x => new { x.TenantId, x.RentalTenantId });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<RentalTenant>().WithMany().HasForeignKey(x => x.RentalTenantId).OnDelete(DeleteBehavior.Restrict);
    }
}
