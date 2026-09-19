using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Construction;

public enum ExpenseCategory
{
    Labor = 0,
    Materials = 1,
    Equipment = 2,
    Subcontractor = 3,
    Other = 4
}

public enum ExpenseStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

/// <summary>
/// A project/work-package expense (not payroll). Approving one posts a journal entry via
/// IConstructionFinancePostingService — see docs/DATABASE.md for the accounting mapping.
/// </summary>
public class Expense : TenantEntity
{
    public Guid ProjectId { get; set; }
    public Guid? WorkPackageId { get; set; }
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public Guid? VendorId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public ExpenseStatus Status { get; set; } = ExpenseStatus.Pending;
    public Guid? JournalEntryId { get; set; }
}
