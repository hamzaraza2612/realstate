using Microsoft.EntityFrameworkCore;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Finance;

/// <summary>
/// Seeds the minimum chart-of-accounts entries a tenant needs for existing workflows to post against
/// (Sales payment collection, Construction expense approval). Called once per tenant at creation time —
/// from OrganizationService (real tenants) and DemoDataSeeder (the demo tenant) — not from the global
/// DbSeeder, since accounts are tenant-owned data, not a platform-wide catalog like Permissions.
/// </summary>
public static class SystemAccountSeeder
{
    private static readonly (string Code, string Name, AccountType Type)[] SystemAccounts =
    {
        (FinanceConstants.CashAndBankAccountCode, "Cash and Bank", AccountType.Asset),
        (FinanceConstants.AccountsPayableAccountCode, "Accounts Payable", AccountType.Liability),
        (FinanceConstants.SalesRevenueAccountCode, "Sales Revenue", AccountType.Revenue),
        (FinanceConstants.ConstructionExpenseAccountCode, "Construction Expenses", AccountType.Expense),
        (FinanceConstants.RentalRevenueAccountCode, "Rental Revenue", AccountType.Revenue),
        (FinanceConstants.FacilityRevenueAccountCode, "Facility Revenue", AccountType.Revenue),
    };

    public static async Task SeedAsync(AppDbContext db, Guid tenantId, CancellationToken ct = default)
    {
        var existingCodes = await db.Accounts
            .IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId)
            .Select(a => a.Code)
            .ToListAsync(ct);

        foreach (var (code, name, type) in SystemAccounts)
        {
            if (existingCodes.Contains(code)) continue;
            db.Accounts.Add(new Account { TenantId = tenantId, Code = code, Name = name, Type = type, IsSystem = true });
        }
    }
}
