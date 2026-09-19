using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Finance;

/// <summary>One debit or credit line within a JournalEntry. Exactly one of Debit/Credit is non-zero — never both, never neither.</summary>
public class JournalLine : TenantEntity
{
    public Guid JournalEntryId { get; set; }
    public Guid AccountId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Description { get; set; }
}
