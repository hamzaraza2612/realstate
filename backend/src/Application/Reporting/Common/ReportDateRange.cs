namespace RealEstateErp.Application.Reporting.Common;

/// <summary>
/// The one place every period-scoped report resolves its default date range, so "no dates given"
/// means the same thing across the whole Reporting module: the current calendar month to date,
/// in UTC (the same timezone convention every other module's `DateOnly` fields already use —
/// this module introduces no new timezone handling). A caller can always override both ends
/// explicitly; only missing values fall back to this default.
/// </summary>
public static class ReportDateRange
{
    public static (DateOnly From, DateOnly To) Resolve(DateOnly? from, DateOnly? to)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var resolvedTo = to ?? today;
        var resolvedFrom = from ?? new DateOnly(resolvedTo.Year, resolvedTo.Month, 1);
        return (resolvedFrom, resolvedTo);
    }
}
