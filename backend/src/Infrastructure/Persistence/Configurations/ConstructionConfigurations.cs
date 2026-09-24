using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Projects;

namespace RealEstateErp.Infrastructure.Persistence.Configurations;

public class WorkPackageConfiguration : IEntityTypeConfiguration<WorkPackage>
{
    public void Configure(EntityTypeBuilder<WorkPackage> b)
    {
        b.ToTable("work_packages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.Budget).HasColumnType("numeric(18,2)");

        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.Status });
        b.HasIndex(x => new { x.ProjectId, x.Code }).IsUnique();

        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ConstructionTaskConfiguration : IEntityTypeConfiguration<ConstructionTask>
{
    public void Configure(EntityTypeBuilder<ConstructionTask> b)
    {
        b.ToTable("construction_tasks");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);

        b.HasIndex(x => new { x.TenantId, x.WorkPackageId });
        b.HasIndex(x => new { x.TenantId, x.AssignedToUserId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        b.HasOne<WorkPackage>().WithMany().HasForeignKey(x => x.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<ConstructionTask>().WithMany().HasForeignKey(x => x.DependsOnTaskId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> b)
    {
        b.ToTable("expenses");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);

        b.HasIndex(x => new { x.TenantId, x.ProjectId });
        b.HasIndex(x => new { x.TenantId, x.WorkPackageId });
        b.HasIndex(x => new { x.TenantId, x.Status });

        // Reporting (Milestone 12): AP aging, expense trend, and budget-vs-actual all filter
        // Approved expenses by ExpenseDate range.
        b.HasIndex(x => new { x.TenantId, x.Status, x.ExpenseDate });

        b.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<WorkPackage>().WithMany().HasForeignKey(x => x.WorkPackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExpensePaymentConfiguration : IEntityTypeConfiguration<ExpensePayment>
{
    public void Configure(EntityTypeBuilder<ExpensePayment> b)
    {
        b.ToTable("expense_payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.ReceiptNumber).HasMaxLength(30).IsRequired();
        b.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        b.Property(x => x.ReferenceNumber).HasMaxLength(100);
        b.Property(x => x.Notes).HasMaxLength(2000);
        b.Property(x => x.IdempotencyKey).HasMaxLength(100);

        b.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        b.HasIndex(x => new { x.TenantId, x.ExpenseId });
        b.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");

        b.HasOne<Expense>().WithMany().HasForeignKey(x => x.ExpenseId).OnDelete(DeleteBehavior.Restrict);
    }
}
