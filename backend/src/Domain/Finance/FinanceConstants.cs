namespace RealEstateErp.Domain.Finance;

/// <summary>Well-known system account codes, seeded once per tenant, that operational modules post against.</summary>
public static class FinanceConstants
{
    public const string CashAndBankAccountCode = "1000";
    public const string AccountsPayableAccountCode = "2200";
    public const string SalesRevenueAccountCode = "4000";
    public const string ConstructionExpenseAccountCode = "5200";
}
