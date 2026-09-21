using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> b)
    {
        b.ToTable("accounts");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(20).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Type });
        b.HasIndex(x => new { x.TenantId, x.ParentAccountId });

        b.HasOne<Account>().WithMany().HasForeignKey(x => x.ParentAccountId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> b)
    {
        b.ToTable("journal_entries");
        b.HasKey(x => x.Id);
        b.Property(x => x.EntryNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.ReferenceType).HasMaxLength(50).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.EntryNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Status });

        // Guarantees at most one journal entry per source event (e.g. one per Sales Payment) — the DB-level half of duplicate-posting protection.
        // A reversal entry uses ReferenceType "Reversal" + ReferenceId = the original entry's Id, so this
        // same index also guarantees at most one reversal per original entry (double-reversal protection).
        b.HasIndex(x => new { x.TenantId, x.ReferenceType, x.ReferenceId }).IsUnique().HasFilter("\"ReferenceId\" IS NOT NULL");

        b.HasOne<JournalEntry>().WithMany().HasForeignKey(x => x.ReversalOfEntryId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class FiscalPeriodConfiguration : IEntityTypeConfiguration<FiscalPeriod>
{
    public void Configure(EntityTypeBuilder<FiscalPeriod> b)
    {
        b.ToTable("fiscal_periods");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();

        b.HasIndex(x => new { x.TenantId, x.Status });

        b.ToTable(t => t.HasCheckConstraint("CK_fiscal_periods_valid_range", "\"EndDate\" >= \"StartDate\""));
    }
}

public class JournalLineConfiguration : IEntityTypeConfiguration<JournalLine>
{
    public void Configure(EntityTypeBuilder<JournalLine> b)
    {
        b.ToTable("journal_lines");
        b.HasKey(x => x.Id);
        b.Property(x => x.Debit).HasColumnType("numeric(18,2)");
        b.Property(x => x.Credit).HasColumnType("numeric(18,2)");
        b.Property(x => x.Description).HasMaxLength(500);

        b.HasIndex(x => new { x.TenantId, x.JournalEntryId });
        b.HasIndex(x => new { x.TenantId, x.AccountId });

        b.HasOne<JournalEntry>().WithMany().HasForeignKey(x => x.JournalEntryId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Restrict);

        b.ToTable(t => t.HasCheckConstraint("CK_journal_lines_debit_xor_credit",
            "(\"Debit\" > 0 AND \"Credit\" = 0) OR (\"Credit\" > 0 AND \"Debit\" = 0)"));
    }
}

public class FinancialDocumentConfiguration : IEntityTypeConfiguration<FinancialDocument>
{
    public void Configure(EntityTypeBuilder<FinancialDocument> b)
    {
        b.ToTable("financial_documents");
        b.HasKey(x => x.Id);
        b.Property(x => x.DocumentNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceType).HasMaxLength(50);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.DocumentNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.Type });
        b.HasIndex(x => new { x.TenantId, x.CustomerId });
    }
}
