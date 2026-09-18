using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Finance;

public enum FinancialDocumentType
{
    Invoice = 0,
    Receipt = 1,
    CreditNote = 2,
    DebitNote = 3
}

public enum FinancialDocumentStatus
{
    Issued = 0,
    Cancelled = 1
}

/// <summary>
/// A generic financial-document envelope (invoice/receipt/credit or debit note) shared across modules,
/// so Sales, Property/Rental, Construction etc. can all produce customer-facing financial paperwork
/// without each module inventing its own document numbering and status handling. No tax engine or line
/// items yet — this is the reusable shell, not a full invoicing system.
/// </summary>
public class FinancialDocument : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "RCPT-DOC-000001").</summary>
    public string DocumentNumber { get; set; } = default!;

    public FinancialDocumentType Type { get; set; }
    public FinancialDocumentStatus Status { get; set; } = FinancialDocumentStatus.Issued;

    public Guid? CustomerId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly IssueDate { get; set; }

    /// <summary>What produced this document, e.g. "SalesPayment" + the Payment's Id.</summary>
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }

    public Guid? JournalEntryId { get; set; }
    public string? Notes { get; set; }
}
