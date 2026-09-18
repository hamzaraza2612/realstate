using Microsoft.EntityFrameworkCore;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Finance;

/// <summary>
/// Seeds the minimum chart-of-accounts entries a tenant needs for existing workflows to post against
/// (currently just Sales payment collection). Called once per tenant at creation time — from
/// OrganizationService (real tenants) and DemoDataSeeder (the demo tenant) — not from the global
/// DbSeeder, since accounts are tenant-owned data, not a platform-wide catalog like Permissions.
/// </summary>
public static class SystemAccountSeeder
{
    public static async Task SeedAsync(AppDbContext db, Guid tenantId, CancellationToken ct = default)
    {
        var existingCodes = await db.Accounts
            .IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId)
            .Select(a => a.Code)
            .ToListAsync(ct);

        if (!existingCodes.Contains(FinanceConstants.CashAndBankAccountCode))
        {
            db.Accounts.Add(new Account
            {
                TenantId = tenantId,
                Code = FinanceConstants.CashAndBankAccountCode,
                Name = "Cash and Bank",
                Type = AccountType.Asset,
                IsSystem = true
            });
        }

        if (!existingCodes.Contains(FinanceConstants.SalesRevenueAccountCode))
        {
            db.Accounts.Add(new Account
            {
                TenantId = tenantId,
                Code = FinanceConstants.SalesRevenueAccountCode,
                Name = "Sales Revenue",
                Type = AccountType.Revenue,
                IsSystem = true
            });
        }
    }
}
