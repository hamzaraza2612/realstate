using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Approvals;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class ApprovalRequestConfiguration : IEntityTypeConfiguration<ApprovalRequest>
{
    public void Configure(EntityTypeBuilder<ApprovalRequest> b)
    {
        b.ToTable("approval_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.EntityType).HasMaxLength(50).IsRequired();
        b.Property(x => x.RequiredPermission).HasMaxLength(150);
        b.Property(x => x.RequestComments).HasMaxLength(2000);
        b.Property(x => x.DecisionComments).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.EntityType, x.EntityId });
        b.HasIndex(x => new { x.TenantId, x.ApproverUserId, x.Status });
        b.HasIndex(x => new { x.TenantId, x.Status });

        // Postgres's built-in xmin system column as an optimistic concurrency token — no extra
        // column needed. Two approvers deciding the same request at the same instant race on
        // SaveChanges; the loser gets DbUpdateConcurrencyException (mapped to "already_decided" in
        // ApprovalService.DecideAsync) instead of silently overwriting the winner's decision.
        b.UseXminAsConcurrencyToken();
    }
}
