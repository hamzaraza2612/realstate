using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Finance;

public enum JournalEntryStatus
{
    Draft = 0,
    Posted = 1,
    Cancelled = 2
}

/// <summary>
/// A double-entry journal entry. Balance (sum debit == sum credit) is enforced by the service layer at
/// creation, not just at posting time, so an entry is never persisted in an unbalanced state; Posted
/// entries are immutable — there is no edit endpoint, only Draft -> Posted and Draft -> Cancelled.
/// </summary>
public class JournalEntry : TenantEntity
{
    /// <summary>Tenant-scoped, human-facing reference (e.g. "JE-000001").</summary>
    public string EntryNumber { get; set; } = default!;

    public DateOnly EntryDate { get; set; }
    public string? Description { get; set; }

    /// <summary>What produced this entry, e.g. "SalesPayment" + the Payment's Id, or "Manual" + null. Drives idempotency for system-generated entries.</summary>
    public string ReferenceType { get; set; } = "Manual";
    public Guid? ReferenceId { get; set; }

    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
}
