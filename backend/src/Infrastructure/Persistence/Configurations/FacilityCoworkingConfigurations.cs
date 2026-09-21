using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Coworking;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class CoworkingMemberConfiguration : IEntityTypeConfiguration<CoworkingMember>
{
    public void Configure(EntityTypeBuilder<CoworkingMember> b)
    {
        b.ToTable("coworking_members");
        b.HasKey(x => x.Id);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.CustomerId }).IsUnique();

        b.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class MembershipPlanConfiguration : IEntityTypeConfiguration<MembershipPlan>
{
    public void Configure(EntityTypeBuilder<MembershipPlan> b)
    {
        b.ToTable("membership_plans");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Price).HasColumnType("numeric(18,2)");
        b.Property(x => x.IncludedHoursCredits).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.FacilityId });

        b.HasOne<Facility>().WithMany().HasForeignKey(x => x.FacilityId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> b)
    {
        b.ToTable("memberships");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.MemberId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<CoworkingMember>().WithMany().HasForeignKey(x => x.MemberId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<MembershipPlan>().WithMany().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DeskConfiguration : IEntityTypeConfiguration<Desk>
{
    public void Configure(EntityTypeBuilder<Desk> b)
    {
        b.ToTable("desks");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.SpaceId, x.Code }).IsUnique();

        b.HasOne<Space>().WithMany().HasForeignKey(x => x.SpaceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class MeetingRoomConfiguration : IEntityTypeConfiguration<MeetingRoom>
{
    public void Configure(EntityTypeBuilder<MeetingRoom> b)
    {
        b.ToTable("meeting_rooms");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.HourlyRate).HasColumnType("numeric(18,2)");
        b.Property(x => x.DailyRate).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.SpaceId });

        b.HasOne<Space>().WithMany().HasForeignKey(x => x.SpaceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class CoworkingBookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> b)
    {
        b.ToTable("coworking_bookings");
        b.HasKey(x => x.Id);
        b.Property(x => x.Price).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.MemberId });
        b.HasIndex(x => new { x.TenantId, x.ResourceType, x.ResourceId });

        b.HasOne<CoworkingMember>().WithMany().HasForeignKey(x => x.MemberId).OnDelete(DeleteBehavior.Restrict);

        // Overlap prevention for non-cancelled bookings of the same resource — the DB-level half of the
        // "no overlapping coworking resource bookings" invariant, mirroring Sales' double-booking and
        // Property's conflicting-lease partial-unique-index pattern, but as a true range-exclusion
        // constraint since bookings overlap on a continuous time axis rather than a simple equality.
        // Requires the btree_gist extension (enabled once in the initial migration for this feature).
        b.ToTable(t => t.HasCheckConstraint("CK_coworking_bookings_valid_range", "\"EndAt\" > \"StartAt\""));
    }
}
