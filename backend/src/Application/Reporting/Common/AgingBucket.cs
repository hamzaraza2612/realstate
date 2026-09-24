namespace RealEstateErp.Application.Reporting.Common;

/// <summary>
/// The single aging-bucket definition shared by every aging report in this module (AR, AP, rent,
/// service charges) so "31-60 days" means the same thing everywhere. Buckets are computed from
/// <c>daysPastDue = today - dueDate</c> (or an analogous reference date for records with no due
/// date, e.g. Construction.Expense's ExpenseDate — documented per report). A non-positive value
/// (not yet due) buckets as "Current".
/// </summary>
public static class AgingBucket
{
    public const string Current = "Current";
    public const string Days1To30 = "1-30";
    public const string Days31To60 = "31-60";
    public const string Days61To90 = "61-90";
    public const string Days90Plus = "90+";

    public static string For(int daysPastDue) => daysPastDue switch
    {
        <= 0 => Current,
        <= 30 => Days1To30,
        <= 60 => Days31To60,
        <= 90 => Days61To90,
        _ => Days90Plus
    };
}
