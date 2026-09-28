using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Ai;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class AiConversationConfiguration : IEntityTypeConfiguration<AiConversation>
{
    public void Configure(EntityTypeBuilder<AiConversation> b)
    {
        b.ToTable("ai_conversations");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.HasIndex(x => new { x.TenantId, x.UserId, x.CreatedAt });
        b.HasMany(x => x.Messages).WithOne(x => x.Conversation!).HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class AiMessageConfiguration : IEntityTypeConfiguration<AiMessage>
{
    public void Configure(EntityTypeBuilder<AiMessage> b)
    {
        b.ToTable("ai_messages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Content).HasMaxLength(8000).IsRequired();
        b.Property(x => x.FactsJson).HasColumnType("text");
        b.Property(x => x.ToolCallsJson).HasColumnType("text");
        b.Property(x => x.Provider).HasMaxLength(50);
        b.Property(x => x.Model).HasMaxLength(100);
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);
        b.HasIndex(x => new { x.ConversationId, x.CreatedAt });
        b.HasIndex(x => x.TenantId);
    }
}

public class AiActionProposalConfiguration : IEntityTypeConfiguration<AiActionProposal>
{
    public void Configure(EntityTypeBuilder<AiActionProposal> b)
    {
        b.ToTable("ai_action_proposals");
        b.HasKey(x => x.Id);
        b.Property(x => x.ActionType).HasMaxLength(100).IsRequired();
        b.Property(x => x.TargetEntityType).HasMaxLength(50);
        b.Property(x => x.ParametersJson).HasColumnType("text").IsRequired();
        b.Property(x => x.Explanation).HasMaxLength(2000).IsRequired();
        b.Property(x => x.ExpectedEffect).HasMaxLength(1000).IsRequired();
        b.Property(x => x.RiskLevel).HasMaxLength(20).IsRequired();
        b.Property(x => x.ResultJson).HasColumnType("text");
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);

        b.HasIndex(x => new { x.TenantId, x.RequestedByUserId, x.Status });
        b.HasIndex(x => x.ConversationId);
        b.HasIndex(x => x.ApprovalRequestId);

        // Guards ExecuteInternalAsync against a genuinely concurrent double-execution (e.g. a
        // retried HTTP request racing the original) the same way Subscription/ApprovalRequest already
        // do — see docs/AI_ARCHITECTURE.md's action-proposal-lifecycle section.
        b.Property<uint>("xmin").IsRowVersion();
    }
}

public class AiUsageRecordConfiguration : IEntityTypeConfiguration<AiUsageRecord>
{
    public void Configure(EntityTypeBuilder<AiUsageRecord> b)
    {
        b.ToTable("ai_usage_records");
        b.HasKey(x => x.Id);
        b.Property(x => x.Provider).HasMaxLength(50).IsRequired();
        b.Property(x => x.Model).HasMaxLength(100);
        b.Property(x => x.ErrorCode).HasMaxLength(50);

        // The rate limiter's hot path: "how many rows for this tenant in the last N minutes" —
        // this composite index is what keeps that a fast index range scan, not a table scan.
        b.HasIndex(x => new { x.TenantId, x.OccurredAt });
    }
}
