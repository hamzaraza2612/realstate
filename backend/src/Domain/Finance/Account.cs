using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Finance;

public enum AccountType
{
    Asset = 0,
    Liability = 1,
    Equity = 2,
    Revenue = 3,
    Expense = 4
}

/// <summary>
/// One node in a tenant's chart of accounts. Self-referencing hierarchy (a "Cash and Bank" account
/// might sit under a "Current Assets" parent, etc.); <see cref="IsSystem"/> accounts are seeded once
/// per tenant for workflows that already exist (Sales payment posting) and can't be deleted or retyped.
/// </summary>
public class Account : TenantEntity
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public AccountType Type { get; set; }
    public Guid? ParentAccountId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsSystem { get; set; }
}
